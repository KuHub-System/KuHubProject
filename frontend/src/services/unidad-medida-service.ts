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
    asociados: number;
}

/**
 * Obtiene todas las unidades de medida con el conteo de productos asociados.
 */
export const obtenerUnidadesService = async (): Promise<IUnidadMedida[]> => {
    console.log('📦 Obteniendo unidades de medida (find-all-view)...');
    try {
        const response = await api.get<UnidadMedidaView[]>('/unidad-medida/find-all-view');

        // Mapear el retorno del backend a nuestra interfaz IUnidadMedida
        return response.data.map((viewDirecta: UnidadMedidaView) => ({
            id: viewDirecta.idUnidad.toString(),
            nombre: viewDirecta.nombreUnidad,
            abreviatura: viewDirecta.abreviatura,
            activo: viewDirecta.activo,
            asociados: viewDirecta.asociados
        }));
    } catch (error) {
        console.error('❌ Error al obtener unidades de medida:', error);
        return [];
    }
};

/**
 * Obtiene solo las unidades de medida activas desde el backend.
 * @returns Promise<IUnidadMedida[]>
 */
export const obtenerUnidadesActivasService = async (): Promise<IUnidadMedida[]> => {
    console.log('📦 Obteniendo unidades de medida activas (find-all-active-true)...');
    try {
        const response = await api.get<UnidadMedidaView[]>('/unidad-medida/find-all-active-true');

        return response.data.map((viewDirecta: UnidadMedidaView) => ({
            id: viewDirecta.idUnidad.toString(),
            nombre: viewDirecta.nombreUnidad,
            abreviatura: viewDirecta.abreviatura,
            activo: viewDirecta.activo,
            asociados: viewDirecta.asociados || 0
        }));
    } catch (error) {
        console.error('❌ Error al obtener unidades de medida activas:', error);
        return [];
    }
};

/**
 * Crea una nueva unidad de medida.
 * @param nombre Nombre de la unidad (ej: Kilogramo)
 * @param abreviatura Abreviatura (ej: KG)
 */
export const crearUnidadService = async (nombre: string, abreviatura: string): Promise<boolean> => {
    console.log(`➕ Creando unidad de medida: ${nombre} (${abreviatura})`);
    try {
        const payload = {
            nombreUnidad: nombre,
            abreviatura: abreviatura,
            activo: true // Por defecto activa
        };
        const response = await api.post<boolean>('/unidad-medida', payload);
        return response.data === true;
    } catch (error: any) {
        console.error('❌ Error al crear unidad de medida:', error);
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al crear la unidad');
    }
};

/**
 * Actualiza una unidad de medida existente.
 * @param id ID de la unidad
 * @param nombre Nuevo nombre
 * @param abreviatura Nueva abreviatura
 */
export const actualizarUnidadService = async (id: string, nombre: string, abreviatura: string): Promise<boolean> => {
    console.log(`📝 Actualizando unidad de medida ${id}: ${nombre} (${abreviatura})`);
    try {
        const payload = {
            idUnidadMedida: parseInt(id),
            nombreUnidad: nombre,
            abreviatura: abreviatura
        };
        const response = await api.patch<boolean>('/unidad-medida', payload);
        return response.data === true;
    } catch (error: any) {
        console.error('❌ Error al actualizar unidad de medida:', error);
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al actualizar la unidad');
    }
};

/**
 * Cambia el estado (activo/inactivo) de una unidad de medida.
 * Siguiendo el mismo patrón de ChangeStatus usado en categorías.
 */
export const cambiarEstadoUnidadService = async (id: string, enable: boolean): Promise<boolean> => {
    console.log(`🔌 [PATCH Status] Cambiando estado de unidad ${id} a: ${enable}`);
    try {
        const payload = {
            idUnidadMedida: parseInt(id),
            enable: enable
        };
        // El usuario especificó PATCH /unidad-medida/update-unidad-status con retorno void
        await api.patch('/unidad-medida/update-unidad-status', payload);
        return true;
    } catch (error: any) {
        console.error('❌ Error al cambiar status de unidad:', error);
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al cambiar estado de la unidad');
    }
};

/**
 * Elimina una unidad de medida.
 * @param id ID de la unidad
 */
export const eliminarUnidadService = async (id: string): Promise<boolean> => {
    console.log(`🗑️ Eliminando unidad de medida del backend: ${id}`);
    try {
        const idNumerico = parseInt(id);
        // El usuario indicó que tiene retorno void
        await api.delete(`/unidad-medida/${idNumerico}`);
        return true;
    } catch (error: any) {
        console.error('❌ Error al eliminar unidad de medida:', error);
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al eliminar la unidad');
    }
};

/**
 * Transfiere productos de una unidad a otra.
 * @param idOrigen ID de la unidad de origen
 * @param idDestino ID de la unidad de destino
 */
export const transferirProductosUnidadService = async (idOrigen: string, idDestino: string): Promise<string> => {
    console.log(`🔄 Transfiriendo productos de unidad ${idOrigen} a ${idDestino}`);
    try {
        const payload = {
            oldIdUnidadMedida: parseInt(idOrigen),
            newIdUnidadMedida: parseInt(idDestino)
        };
        // El usuario especificó PUT /unidad-medida para la reasociación
        const response = await api.put<string>('/unidad-medida', payload);
        return response.data;
    } catch (error: any) {
        console.error('❌ Error en transferencia de unidades:', error);
        throw new Error(error.response?.data?.message || error.response?.data || 'Error al transferir productos');
    }
};
