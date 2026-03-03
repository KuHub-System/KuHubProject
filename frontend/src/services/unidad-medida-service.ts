import api from '../config/Axios';
import { IUnidadMedida } from '../types/inventario.types';

/**
 * Interface que representa el DTO de retorno del backend para la vista de unidades.
 */
export interface UnidadMedidaView {
    idUnidad: number;
    nombreUnidad: string;
    abreviatura: string;
    activo: boolean;
    esFraccionario: boolean;
    asociados: number;
}

/**
 * Obtiene todas las unidades de medida con el conteo de productos asociados.
 */
export const obtenerUnidadesService = async (): Promise<IUnidadMedida[]> => {
    try {
        const response = await api.get<UnidadMedidaView[]>('/unidad-medida/find-all-view');

        // Mapear el retorno del backend a nuestra interfaz IUnidadMedida
        // Somos extremadamente robustos con los nombres de propiedad y tipos
        return response.data.map((viewDirecta: any) => {
            const val = viewDirecta.esFraccionario !== undefined ? viewDirecta.esFraccionario :
                viewDirecta.es_fraccionario !== undefined ? viewDirecta.es_fraccionario :
                    viewDirecta.esFraccionado !== undefined ? viewDirecta.esFraccionado :
                        viewDirecta.es_fraccionado !== undefined ? viewDirecta.es_fraccionado :
                            viewDirecta.fraccionario !== undefined ? viewDirecta.fraccionario :
                                viewDirecta.fraccionado;

            return {
                id: (viewDirecta.idUnidad ?? viewDirecta.id_unidad ?? viewDirecta.id).toString(),
                nombre: viewDirecta.nombreUnidad ?? viewDirecta.nombre_unidad ?? viewDirecta.nombre,
                abreviatura: viewDirecta.abreviatura,
                activo: !!(viewDirecta.activo ?? viewDirecta.enable),
                esFraccionario: val === true || val === 1 || val === "true" || val === "1" || val === "T",
                asociados: Number(viewDirecta.asociados ?? 0)
            };
        });
    } catch (error) {
        return [];
    }
};

/**
 * Obtiene solo las unidades de medida activas desde el backend.
 * @returns Promise<IUnidadMedida[]>
 */
export const obtenerUnidadesActivasService = async (): Promise<IUnidadMedida[]> => {
    try {
        const response = await api.get<UnidadMedidaView[]>('/unidad-medida/find-all-active-true');

        return response.data.map((viewDirecta: any) => {
            const val = viewDirecta.esFraccionario !== undefined ? viewDirecta.esFraccionario :
                viewDirecta.es_fraccionario !== undefined ? viewDirecta.es_fraccionario :
                    viewDirecta.esFraccionado !== undefined ? viewDirecta.esFraccionado :
                        viewDirecta.es_fraccionado !== undefined ? viewDirecta.es_fraccionado :
                            viewDirecta.fraccionario !== undefined ? viewDirecta.fraccionario :
                                viewDirecta.fraccionado;

            return {
                id: (viewDirecta.idUnidad ?? viewDirecta.id_unidad ?? viewDirecta.id).toString(),
                nombre: viewDirecta.nombreUnidad ?? viewDirecta.nombre_unidad ?? viewDirecta.nombre,
                abreviatura: viewDirecta.abreviatura,
                activo: !!(viewDirecta.activo ?? viewDirecta.enable),
                esFraccionario: val === true || val === 1 || val === "true" || val === "1" || val === "T",
                asociados: Number(viewDirecta.asociados ?? 0)
            };
        });
    } catch (error) {
        return [];
    }
};

/**
 * Crea una nueva unidad de medida.
 * @param nombre Nombre de la unidad (ej: Kilogramo)
 * @param abreviatura Abreviatura (ej: KG)
 */
export const crearUnidadService = async (nombre: string, abreviatura: string, esFraccionario: boolean): Promise<boolean> => {
    try {
        const payload: any = {
            nombreUnidad: nombre,
            abreviatura: abreviatura,
            esFraccionario: esFraccionario,
            es_fraccionario: esFraccionario,
            esFraccionado: esFraccionario,
            es_fraccionado: esFraccionario,
            activo: true // Por defecto activa
        };
        const response = await api.post<boolean>('/unidad-medida', payload);
        return response.data === true;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al crear la unidad');
    }
};

/**
 * Actualiza una unidad de medida existente.
 * @param id ID de la unidad
 * @param nombre Nuevo nombre
 * @param abreviatura Nueva abreviatura
 */
export const actualizarUnidadService = async (id: string, nombre: string, abreviatura: string, esFraccionario: boolean): Promise<boolean> => {
    try {
        const payload: any = {
            idUnidadMedida: parseInt(id),
            idUnidad: parseInt(id), // Algunos endpoints usan idUnidad
            nombreUnidad: nombre,
            abreviatura: abreviatura,
            // Mandamos todas las variaciones posibles para el booleano
            esFraccionario: esFraccionario,
            es_fraccionario: esFraccionario,
            esFraccionado: esFraccionario,
            es_fraccionado: esFraccionario
        };
        const response = await api.patch<any>('/unidad-medida', payload);
        // Si el backend retorna true O el objeto actualizado, lo consideramos éxito
        return response.status === 200 || response.status === 204 || !!response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al actualizar la unidad');
    }
};

/**
 * Cambia el estado (activo/inactivo) de una unidad de medida.
 * Siguiendo el mismo patrón de ChangeStatus usado en categorías.
 */
export const cambiarEstadoUnidadService = async (id: string, enable: boolean): Promise<boolean> => {
    try {
        const payload = {
            idUnidadMedida: parseInt(id),
            enable: enable
        };
        // El usuario especificó PATCH /unidad-medida/update-unidad-status con retorno void
        await api.patch('/unidad-medida/update-unidad-status', payload);
        return true;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al cambiar estado de la unidad');
    }
};

/**
 * Elimina una unidad de medida.
 * @param id ID de la unidad
 */
export const eliminarUnidadService = async (id: string): Promise<boolean> => {
    try {
        const idNumerico = parseInt(id);
        // El usuario indicó que tiene retorno void
        await api.delete(`/unidad-medida/${idNumerico}`);
        return true;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al eliminar la unidad');
    }
};

/**
 * Transfiere productos de una unidad a otra.
 * @param idOrigen ID de la unidad de origen
 * @param idDestino ID de la unidad de destino
 */
export const transferirProductosUnidadService = async (idOrigen: string, idDestino: string): Promise<string> => {
    try {
        const payload = {
            oldIdUnidadMedida: parseInt(idOrigen),
            newIdUnidadMedida: parseInt(idDestino)
        };
        // El usuario especificó PUT /unidad-medida para la reasociación
        const response = await api.put<string>('/unidad-medida', payload);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al transferir productos');
    }
};
