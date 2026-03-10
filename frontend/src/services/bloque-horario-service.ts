/**
 * SERVICIO PARA BLOQUES HORARIOS
 */

import api from '../config/Axios';
import { IBloqueHorario } from '../types/bloque-horario.types';

export interface IBloqueDisponible {
    idBloque: number;
    numeroBloque: number;
    horaInicio: string;
    horaFin: string;
}

/**
 * Filtrar bloques disponibles por sala y día de la semana
 * POST /v1/bloque-horario/filter-by-day-week-and-id-room
 */
export const filtrarBloquesPorSalaYDiaService = async (
    idSala: number,
    diaSemana: string
): Promise<IBloqueDisponible[]> => {
    try {
        const response = await api.post<IBloqueDisponible[]>('/bloque-horario/filter-by-day-week-and-id-room', {
            idSala,
            diaSemana
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al obtener los bloques disponibles');
    }
};

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
