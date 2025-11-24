/**
 * CONFIGURACIÓN CENTRALIZADA DE AXIOS
 * Maneja todas las peticiones HTTP de la aplicación
 *
 * ✅ CORREGIDO: Interceptor inteligente para manejar /login sin /api/v1
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { obtenerSesionActualService } from '../services/auth-service';

// Crear instancia de axios con configuración base
const api: AxiosInstance = axios.create({
    baseURL: 'http://localhost:8080/api/v1',  // ⚠️ Para producción cambiar a AWS
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ✅ INTERCEPTOR DE REQUEST - Maneja /login y agrega token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // ✅ NUEVO: Si la URL es /login, usar baseURL sin /api/v1
        if (config.url === '/login') {
            config.baseURL = 'http://localhost:8080';  // ⚠️ Para producción cambiar a AWS
            console.log('🔐 Petición de login detectada - usando baseURL:', config.baseURL);
        }

        // Agregar token de autenticación si existe
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
                        console.warn('⚠️ Token inválido o expirado - redirigiendo a login');
                        localStorage.removeItem('sesion_actual');
                        window.location.href = '/login';
                    }
                    break;
                case 403:
                    // Prohibido
                    console.error('❌ Acceso denegado');
                    break;
                case 404:
                    // No encontrado
                    console.error('❌ Recurso no encontrado');
                    break;
                case 500:
                    // Error del servidor
                    console.error('❌ Error interno del servidor');
                    break;
                default:
                    console.error('❌ Error en la petición:', error.message);
            }
        } else if (error.request) {
            // La petición fue hecha pero no se recibió respuesta
            console.error('❌ No se recibió respuesta del servidor');
        } else {
            // Algo pasó al configurar la petición
            console.error('❌ Error al configurar la petición:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;