import api from '../config/Axios';

export interface ISala {
    idSala: number;
    codSala: string;
    nombreSala: string;
    activo: boolean;
}

/**
 * Obtener todas las salas activas
 * GET /v1/sala/find-all-active
 */
export const obtenerSalasActivasService = async (): Promise<ISala[]> => {
    try {
        const response = await api.get<ISala[]>('/sala/find-all-active');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al obtener las salas activas');
    }
};
