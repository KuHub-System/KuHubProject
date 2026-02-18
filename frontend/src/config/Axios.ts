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

        // Si falla la nube y no estamos en local, reintentar en local
        if (!error.response && !isLocalMode && originalRequest) {
            console.warn('🌐 Intentando conector local...');
            isLocalMode = true;
            originalRequest.baseURL = LOCAL_URL;
            return api(originalRequest);
        }
        return Promise.reject(error);
    }
);

export default api;
