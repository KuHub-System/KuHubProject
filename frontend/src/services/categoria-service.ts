/**
 * SERVICIO DE CATEGORÍAS - ADAPTADOR FRONTEND ↔ BACKEND
 * Maneja las peticiones relacionadas con las categorías en el backend.
 * 
 * Ubicación: src/services/categoria-service.ts
 */

import api from '../config/Axios';
import { ICategoria } from '../types/inventario.types';

/**
 * DTO para la categoría que viene del backend
 */
interface BackendCategoriaDTO {
    idCategoria: number;
    nombreCategoria: string;
    activo: boolean;
    asociados: number;
}

/**
 * Transforma el DTO del backend al formato ICategoria del frontend
 */
const transformarBackendAFrontend = (dto: BackendCategoriaDTO): ICategoria => ({
    id: dto.idCategoria.toString(),
    nombre: dto.nombreCategoria,
    activo: dto.activo,
    asociados: dto.asociados
});

/**
 * Obtiene todas las categorías desde el backend
 * @returns Promise<ICategoria[]>
 */
export const obtenerCategoriasService = async (): Promise<ICategoria[]> => {

    try {
        const response = await api.get<BackendCategoriaDTO[]>('/categoria/find-all-view');
        return response.data.map(transformarBackendAFrontend);

    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al cargar las categorías');
    }
};

/**
 * Obtiene solo las categorías activas desde el backend
 * @returns Promise<ICategoria[]>
 */
export const obtenerCategoriasActivasService = async (): Promise<ICategoria[]> => {

    try {
        const response = await api.get<BackendCategoriaDTO[]>('/categoria/active-true');
        return response.data.map(transformarBackendAFrontend);

    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al cargar las categorías activas');
    }
};

/**
 * Crea una nueva categoría en el backend
 * @param nombreCategoria Nombre de la categoría a crear
 * @returns Promise<boolean> true si se creó correctamente, false en caso contrario
 */
export const crearCategoriaService = async (nombreCategoria: string): Promise<boolean> => {

    try {
        // El backend espera un objeto CreateCategoriaDTO { nombreCategoria: String }
        const response = await api.post<boolean>('/categoria', { nombreCategoria });

        return response.data === true;

    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al crear la categoría');
    }
};

/**
 * Actualiza una categoría existente usando PATCH
 * @param id ID de la categoría (Short en backend)
 * @param nombre Nuevo nombre de la categoría
 * @param activo Estado actual de la categoría
 * @returns Promise<boolean>
 */
export const actualizarCategoriaService = async (id: string, nombre: string, activo: boolean): Promise<boolean> => {

    try {
        const idNumerico = parseInt(id);

        // Payload según UpdateCategoriaDTO
        const payload = {
            idCategoria: idNumerico,
            nombreCategoria: nombre,
            activo: activo
        };

        const response = await api.patch<boolean>('/categoria', payload);

        return response.data === true;

    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al actualizar la categoría');
    }
};

/**
 * Elimina una categoría del backend
 * @param id ID de la categoría a eliminar
 * @returns Promise<boolean>
 */
export const eliminarCategoriaService = async (id: string): Promise<boolean> => {

    try {
        const idNumerico = parseInt(id);

        // Verificación extra-defensiva: si por algún motivo llegamos aquí, registramos el rastro
        const response = await api.delete<boolean>(`/categoria/${idNumerico}`);

        return response.data === true;

    } catch (error: any) {

        // El backend puede enviar un objeto con message o una cadena directamente
        const backendMessage = error.response?.data?.message ||
            error.response?.data ||
            error.message ||
            'Error al eliminar la categoría';

        // Lanzamos el error con el mensaje procesado para que el modal lo capture
        throw new Error(backendMessage.toString());
    }
};

/**
 * Cambia el estado (activo/inactivo) de una categoría
 * Usa el PatchMapping solicitado por el usuario
 * @param id ID de la categoría
 * @param activo Nuevo estado
 */
export const cambiarEstadoCategoriaService = async (id: string, activo: boolean): Promise<boolean> => {

    try {
        const idNumerico = parseInt(id);

        // El usuario indicó usar ChangeStatusActiveCategoriaDTO
        // Payload: { idCategoria: number, enable: boolean }
        const payload = {
            idCategoria: idNumerico,
            enable: activo
        };

        await api.patch('/categoria/change-status', payload);

        return true;

    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al cambiar el estado');
    }
};

/**
 * Transfiere productos de una categoría a otra
 * @param idOrigen ID de la categoría de origen
 * @param idDestino ID de la categoría de destino
 * @returns Promise<string> Mensaje del backend
 */
export const transferirProductosService = async (idOrigen: string, idDestino: string): Promise<string> => {

    try {
        const payload = {
            oldIdCategoria: parseInt(idOrigen),
            newIdCategoria: parseInt(idDestino)
        };

        // El backend indica que el endpoint es /categoria/change-products-to-another-category y devuelve un string
        const response = await api.put<string>('/categoria/change-products-to-another-category', payload);

        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al transferir productos');
    }
};

/**
 * Obtiene todas las categorías activas como JSON para filtros de selección.
 * Formato: [ { "id": 1, "nombre": "Bebidas" }, { "id": 2, "nombre": "Verduras" }, ... ]
 * @returns Promise<Array<{ id: number; nombre: string }>>
 */
export const obtenerCategoriasActivasJsonService = async (): Promise<Array<{ id: number; nombre: string }>> => {
    try {
        const response = await api.get<string>('/categoria/activas-json');
        if (!response.data || response.data === '[]' || response.data === 'null') {
            return [];
        }
        return JSON.parse(response.data);
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al cargar las categorías activas');
    }
};
