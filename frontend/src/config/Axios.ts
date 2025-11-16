/**
 * CONFIGURACIÓN CENTRALIZADA DE AXIOS
 * Maneja todas las peticiones HTTP de la aplicación
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { obtenerSesionActualService } from '../services/auth-service';

// Crear instancia de axios con configuración base
const api: AxiosInstance = axios.create({
    baseURL: 'http://3.95.206.182/api/v1',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const sesion = obtenerSesionActualService();

        if (sesion?.token && config.headers) {
            config.headers.Authorization = `Bearer ${sesion.token}`;
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        // Manejo centralizado de errores
        if (error.response) {
            // El servidor respondió con un código de estado fuera del rango 2xx
            const status = error.response.status;

            switch (status) {
                case 401:
                    // No autorizado - redirigir a login
                    if (window.location.pathname !== '/login') {
                        localStorage.removeItem('sesion_actual');
                        window.location.href = '/login';
                    }
                    break;
                case 403:
                    // Prohibido
                    console.error('Acceso denegado');
                    break;
                case 404:
                    // No encontrado
                    console.error('Recurso no encontrado');
                    break;
                case 500:
                    // Error del servidor
                    console.error('Error interno del servidor');
                    break;
                default:
                    console.error('Error en la petición:', error.message);
            }
        } else if (error.request) {
            // La petición fue hecha pero no se recibió respuesta
            console.error('No se recibió respuesta del servidor');
        } else {
            // Algo pasó al configurar la petición
            console.error('Error al configurar la petición:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;