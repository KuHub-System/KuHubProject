import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { obtenerSesionActualService } from '../services/auth-service';

import { logger } from '../utils/logger';

// ========================================================================
// Detección automática de entorno:
// - Cloud (GitHub Actions / AWS): usa VITE_API_URL inyectada en el build
// - Local: detecta hostname y apunta a localhost:8080
// ========================================================================
const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:8080/api/v1' : '/api/v1');
logger.log(`[AXIOS] BaseURL → ${API_URL}`);

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
        // Handle 401 Unauthorized (Token expires or invalid)
        if (error.response?.status === 401) {
            const url = error.config?.url ?? '';
            logger.error('❌ 401 UNAUTHORIZED detectado en interceptor Axios');
            logger.error(`  → URL: ${url}`);
            logger.error(`  → Response:`, error.response?.data);
            
            // Si el error de 401 es en el login, no redirigimos (el servicio maneja su error)
            if (url.includes('/auth/login')) {
                return Promise.reject(error);
            }

            // Si el error de 401 es en permisos, no redirigimos al login.
            // El PermissionContext maneja su propio error sin necesidad de logout.
            if (url.includes('/permisos/')) {
                logger.error('  → Error de permisos ignorado por interceptor (no logout)');
                return Promise.reject(error);
            }

            // Para cualquier otra 401: el token venció → forzar logout
            localStorage.removeItem('sesion_actual');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;