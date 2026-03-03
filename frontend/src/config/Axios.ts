import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { obtenerSesionActualService } from '../services/auth-service';

const CLOUD_URL = 'http://3.94.161.1/api/v1';
const LOCAL_URL = 'http://localhost:8080/api/v1';

// Instancia base (empezamos intentando la nube)
const api: AxiosInstance = axios.create({
    baseURL: CLOUD_URL,
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' },
});

// Variable para saber si ya cambiamos a modo local
let isLocalMode = false;

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Establecer la base actual según el modo
        config.baseURL = isLocalMode ? LOCAL_URL : CLOUD_URL;

        const sesion = obtenerSesionActualService();
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
                }
            }
        }
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // Si falla la nube y no estamos en local, reintentar en local
        if (!error.response && !isLocalMode && originalRequest) {
            isLocalMode = true;
            originalRequest.baseURL = LOCAL_URL;
            return api(originalRequest);
        }

        // Handle 401 Unauthorized (Token expires or invalid)
        if (error.response?.status === 401) {
            localStorage.removeItem('sesion_actual');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
