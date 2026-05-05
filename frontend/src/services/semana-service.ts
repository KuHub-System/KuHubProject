/**
 * SERVICIO PARA SEMANAS ACADÉMICAS
 */

import api from '../config/Axios';
import { ISemana, IWeekGeneratorDTO, IWeekReasignDTO } from '../types/semana.types';

export interface IPeriodoAcademico {
  anio: number;
  semestres: number[];
}

// Caché para semanas por periodo: key = `${anio}-${semestre}`
const semanasPorPeriodoCache = new Map<string, ISemana[]>();

/**
 * Obtener periodos académicos agrupados (anio + semestres disponibles)
 * GET /v1/semanas/find-grouped-perions-academic
 */
export const obtenerPeriodosAcademicosService = async (): Promise<IPeriodoAcademico[]> => {
  try {
    const response = await api.get<IPeriodoAcademico[]>('/semanas/find-grouped-perions-academic');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener los periodos académicos');
  }
};

/**
 * Obtener semanas por año y semestre con caché
 * POST /v1/semanas/find-by-weekly-for-solicitation
 */
export const obtenerSemanasPorPeriodoService = async (anio: number, semestre: number): Promise<ISemana[]> => {
  const key = `${anio}-${semestre}`;
  if (semanasPorPeriodoCache.has(key)) return semanasPorPeriodoCache.get(key)!;
  try {
    const response = await api.post<ISemana[]>('/semanas/find-by-weekly-for-solicitation', { anio, semestre });
    if (response.data.length > 0) semanasPorPeriodoCache.set(key, response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener las semanas del período');
  }
};

/**
 * Detecta el periodo académico actual basándose en sysdate.
 * Meses 1-6 → semestre 1, meses 7-12 → semestre 2.
 */
export const detectarPeriodoActual = (): { anio: number; semestre: number } => {
  const today = new Date();
  return {
    anio: today.getFullYear(),
    semestre: today.getMonth() + 1 <= 6 ? 1 : 2,
  };
};

/**
 * Encuentra la semana actual dentro de una lista de semanas.
 */
export const encontrarSemanaActual = (semanas: ISemana[]): ISemana | null => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return semanas.find(s => {
    const ini = new Date(s.fechaInicio + 'T00:00:00');
    const fin = new Date(s.fechaFin + 'T23:59:59');
    return today >= ini && today <= fin;
  }) ?? null;
};

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
    // También invalidar el cache por período para ese año
    Object.keys(semanasPorPeriodoCache)
      .filter(key => key.startsWith(`${anio}-`))
      .forEach(key => semanasPorPeriodoCache.delete(key));
  } else {
    // Limpiar todos los cachés
    Object.keys(weeksCache).forEach(key => delete weeksCache[parseInt(key)]);
    semanasPorPeriodoCache.clear();
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

/**
 * Reasignar el calendario semestral existente a una nueva fecha de inicio.
 * Actualiza las 18 semanas del año/semestre indicado conservando su estructura.
 * ⬜ Sin uso frontend aún — endpoint pendiente de implementación en backend.
 * PUT /v1/semanas/reasignar-semester-calendar
 */
export const reasignarCalendarioService = async (dto: IWeekReasignDTO): Promise<ISemana[]> => {
  try {
    const response = await api.put<ISemana[]>('/semanas/reasignar-semester-calendar', dto);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al reasignar el calendario semestral');
  }
};
