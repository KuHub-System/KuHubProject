import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { obtenerSesionActualService, renovarSesionService } from '../services/auth-service';

import { logger } from '../utils/logger';

// Flag para evitar múltiples llamadas simultáneas a /auth/refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
};

// ========================================================================
// Detección automática de entorno:
// - Cloud (GitHub Actions / AWS): usa VITE_API_URL inyectada en el build
// - Local: detecta hostname y apunta a localhost:8080
// ========================================================================
const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:8080/api/v1' : '/api/v1');
logger.log(`[AXIOS] BaseURL → ${API_URL}`);

// ── Mostrar errores persistidos de sesiones anteriores ────────────────────────
// Los errores que causaron un redirect a /login quedan guardados en localStorage.
// Se muestran al cargar la app para poder depurar qué endpoint falló.
if (typeof window !== 'undefined') {
    const savedErrors = localStorage.getItem('__api_errors');
    if (savedErrors) {
        try {
            const errors = JSON.parse(savedErrors);
            if (errors.length > 0) {
                console.group('%c[AXIOS] Errores de sesión anterior (antes del último redirect a /login)', 'color:orange;font-weight:bold');
                errors.forEach((e: any) => console.error(`  ${e.ts} | HTTP ${e.status} | ${e.method} ${e.url}`, e.data));
                console.groupEnd();
                // Limpiar después de mostrar para no acumular indefinidamente
                localStorage.removeItem('__api_errors');
            }
        } catch (_) { /* ignore */ }
    }
}

const api: AxiosInstance = axios.create({
    baseURL: API_URL, // <--- Aplicamos la variable aquí
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const sesion = obtenerSesionActualService();

        // Agregar el token si existe y no es la ruta de login
        if (sesion?.token && config.headers && !config.url?.includes('/auth/login')) {
            config.headers.Authorization = `Bearer ${sesion.token}`;
        }

        // Notificar actividad de API para reiniciar el timeout de inactividad
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('api-request'));
        }

        return config;
    }
);

api.interceptors.response.use(
    (response) => {
        // Renovar token si viene en el header Authorization
        const authHeader = response.headers['authorization'];
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            const newToken = authHeader.substring(7);
            const sesionStr = localStorage.getItem('sesion_actual');
            if (sesionStr) {
                try {
                    const sesion = JSON.parse(sesionStr);
                    sesion.token = newToken;
                    localStorage.setItem('sesion_actual', JSON.stringify(sesion));
                    // Disparar evento para reiniciar el contador de inactividad
                    window.dispatchEvent(new Event('api-request'));
                } catch (e) {
                    logger.error("Error al actualizar la sesión", e);
                }
            }
        }
        return response;
    },
    async (error: AxiosError) => {
        const status = error.response?.status;
        const url    = error.config?.url ?? '';

        // ── Persistir error en localStorage ANTES de cualquier redirect ──────
        // Así el error sobrevive la recarga y puede leerse en la próxima sesión.
        if (status === 401 || status === 403) {
            try {
                const errorEntry = {
                    ts:     new Date().toISOString(),
                    status,
                    url,
                    data:   error.response?.data,
                    method: error.config?.method?.toUpperCase(),
                };
                const prev = JSON.parse(localStorage.getItem('__api_errors') ?? '[]');
                prev.push(errorEntry);
                // Guardar solo los últimos 20 errores
                localStorage.setItem('__api_errors', JSON.stringify(prev.slice(-20)));
                logger.error(`❌ HTTP ${status} en ${error.config?.method?.toUpperCase()} ${url}`, error.response?.data);
            } catch (_) { /* ignore storage errors */ }
        }

        // Handle 401 Unauthorized (Token expires or invalid)
        if (status === 401) {
            // Lista de prefijos cuyas rutas no deben intentar renovar ni forzar logout.
            const noLogoutPrefixes = [
                '/auth/login',               // El servicio de login maneja su propio error
                '/auth/refresh',             // Si el refresh falla, no reintentar
                '/auth/logout',              // Logout no debe redirigir
                '/permisos/',                // La PermissionContext maneja su propio error
                '/semanas/',                 // Búsquedas de semana usadas en todas las páginas
                '/pedido/entregas-diarias',  // Gestión de Pedidos Diarios (bodega)
                '/pedido/preparar-entrega',  // Preparar entrega (bodega)
            ];

            if (noLogoutPrefixes.some(prefix => url.includes(prefix))) {
                logger.error('  → Error ignorado por interceptor (no logout):', url);
                return Promise.reject(error);
            }

            // Intentar renovar el token usando el Refresh Token (cookie HttpOnly)
            const originalRequest = error.config!;

            if (!isRefreshing) {
                isRefreshing = true;
                renovarSesionService()
                    .then(newToken => {
                        isRefreshing = false;
                        if (newToken) {
                            onTokenRefreshed(newToken);
                        } else {
                            // No hay refresh token válido → logout
                            refreshSubscribers = [];
                            localStorage.removeItem('sesion_actual');
                            window.location.href = '/login';
                        }
                    })
                    .catch(() => {
                        isRefreshing = false;
                        refreshSubscribers = [];
                        localStorage.removeItem('sesion_actual');
                        window.location.href = '/login';
                    });
            }

            // Encolar la petición original para reintentarla cuando llegue el nuevo token
            return new Promise(resolve => {
                subscribeTokenRefresh((token: string) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    resolve(api(originalRequest));
                });
            });
        }

        return Promise.reject(error);
    }
);

export default api;