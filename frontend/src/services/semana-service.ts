/**
 * SERVICIO PARA SEMANAS ACADÉMICAS
 */

import api from '../config/Axios';
import { ISemana, IWeekGeneratorDTO } from '../types/semana.types';

// Caché simple para almacenar semanas por año
const weeksCache: Record<number, ISemana[]> = {};

/**
 * Obtener semanas del sistema filtradas por año (POST con path variable)
 * Se implementa caché en frontend para evitar consultas repetitivas.
 * POST /v1/semanas/find-all-by-year/{year}
 */
export const obtenerSemanasService = async (anio: number, forceRefresh: boolean = false): Promise<ISemana[]> => {
  // Retornar desde caché si existe y no se requiere refresco
  if (!forceRefresh && weeksCache[anio]) {
    return weeksCache[anio];
  }

  try {
    const response = await api.post<ISemana[]>(`/semanas/find-all-by-year/${anio}`);
    weeksCache[anio] = response.data;
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || `Error al obtener las semanas del año ${anio}`);
  }
};

/**
 * Limpia el caché de semanas (útil tras generar un nuevo calendario)
 * @param {number} anio - Opcional, si se provee limpia solo ese año, sino limpia todo.
 */
export const invalidarCacheSemanas = (anio?: number) => {
  if (anio) {
    delete weeksCache[anio];
  } else {
    // Vaciar objeto sin perder referencia si fuera necesario, o simplemente reasignar
    Object.keys(weeksCache).forEach(key => delete weeksCache[parseInt(key)]);
  }
};

/**
 * Obtener lista de años disponibles para el filtro de semanas
 * GET /v1/semanas/years-for-filter-week
 */
export const obtenerAniosFiltroService = async (): Promise<number[]> => {
  try {
    const response = await api.get<number[]>('/semanas/years-for-filter-week');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener los años para el filtro');
  }
};

/**
 * Generar calendario semestral
 * POST /v1/semanas/generate-semester-calendar
 * Retorna true si fue exitoso
 */
export const generarCalendarioService = async (dto: IWeekGeneratorDTO): Promise<boolean> => {
  try {
    await api.post('/semanas/generate-semester-calendar', dto);
    return true;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al generar el calendario semestral');
  }
};
