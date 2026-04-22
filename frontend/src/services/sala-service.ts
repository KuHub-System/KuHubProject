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

/**
 * Crear nueva sala
 * POST /v1/sala/create
 */
export const crearSalaService = async (data: { codSala: string; nombreSala: string }): Promise<ISala> => {
    try {
        const response = await api.post<ISala>('/sala/create', data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al crear la sala');
    }
};

/**
 * Actualizar cod_sala y nombre_sala de una sala existente
 * PATCH /v1/sala/update/:id
 */
export const actualizarSalaService = async (
    idSala: number,
    data: { codSala: string; nombreSala: string }
): Promise<ISala> => {
    try {
        const response = await api.patch<ISala>(`/sala/update/${idSala}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al actualizar la sala');
    }
};

/**
 * Eliminación lógica de sala (falla con error si tiene reservas activas)
 * DELETE /v1/sala/soft-delete/:id
 */
export const eliminarSalaService = async (idSala: number): Promise<void> => {
    try {
        await api.delete(`/sala/soft-delete/${idSala}`);
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            error.response?.data ||
            'Error al desactivar la sala'
        );
    }
};
