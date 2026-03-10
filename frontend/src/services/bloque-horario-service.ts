/**
 * SERVICIO PARA BLOQUES HORARIOS
 */

import api from '../config/Axios';
import { IBloqueHorario } from '../types/bloque-horario.types';

/**
 * Obtener todos los bloques horarios del sistema
 */
export const obtenerBloquesHorarioService = async (): Promise<IBloqueHorario[]> => {
    try {
        const response = await api.get<IBloqueHorario[]>('/bloque-horario/find-all');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al obtener los bloques horarios');
    }
};
