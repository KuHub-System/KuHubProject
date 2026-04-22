/**
 * SERVICIO PARA RESERVAS DE SALA
 */

import api from '../config/Axios';

export interface IReservaActiva {
  nombreAsignatura: string;
  nombreSeccion: string;
  nombreSala: string;
  codSala: string;
  /** Valor en formato DB: LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO */
  diaSemana: string;
  numeroBloque: number;
  horaInicio: string;
  horaFin: string;
}

/** Mapeo de enum DB → etiqueta de visualización con tildes */
export const DIA_DISPLAY: Record<string, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

/**
 * Obtiene todas las reservas de sala activas con datos desnormalizados.
 * GET /v1/reserva-sala/find-all-active
 */
export const obtenerReservasActivasService = async (): Promise<IReservaActiva[]> => {
  try {
    const response = await api.get<IReservaActiva[]>('/reserva-sala/find-all-active');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener las reservas activas');
  }
};
