import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { obtenerSesionActualService } from '../services/auth-service';

const CLOUD_URL = 'http://3.94.161.1';
const LOCAL_URL = 'http://localhost:8080';

// Instancia base (empezamos intentando la nube)
const api: AxiosInstance = axios.create({
    baseURL: `${CLOUD_URL}/api/v1`,
    timeout: 5000, // Bajamos a 5s para que el salto a local sea más rápido
    headers: { 'Content-Type': 'application/json' },
});

// Variable para saber si ya cambiamos a modo local
let isLocalMode = false;

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Ajustar baseURL si es login (fuera de /api/v1)
        const currentBase = isLocalMode ? LOCAL_URL : CLOUD_URL;

        if (config.url === '/login') {
            config.baseURL = currentBase;
        } else {
            config.baseURL = `${currentBase}/api/v1`;
        }

        const sesion = obtenerSesionActualService();
        if (sesion?.token && config.headers) {
            config.headers.Authorization = `Bearer ${sesion.token}`;
        }
        return config;
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // Si el error es de conexión (no hay respuesta) y no hemos probado local aún
        if (!error.response && !isLocalMode && originalRequest) {
            console.warn('🌐 La nube no responde. Intentando conector local...');

            isLocalMode = true; // Activamos modo local para futuras peticiones

            // Reintentar la petición fallida con la nueva base
            if (originalRequest.url === '/login') {
                originalRequest.baseURL = LOCAL_URL;
            } else {
                originalRequest.baseURL = `${LOCAL_URL}/api/v1`;
            }

            return api(originalRequest); // Reintento
        }

        // ... resto de tu lógica de errores (401, 403, 500)
        return Promise.reject(error);
    }
);

export default api;