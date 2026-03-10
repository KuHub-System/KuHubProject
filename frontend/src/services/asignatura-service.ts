/**
 * SERVICIO DE GESTIÓN DE ASIGNATURAS - CONECTADO AL BACKEND
 * Maneja la comunicación con la API REST de Spring Boot
 */

import api from '../config/Axios';
import {
  IAsignatura,
  ISeccion,
  IAsignaturaCreacion,
  IAsignaturaActualizacion,
  ISeccionCreacion,
  ISeccionActualizacion,
  IBloqueHorario,
  EstadoSeccion,
  DiaSemana
} from '../types/asignatura.types';

// ============================================
// INTERFACES PARA RESPUESTAS DEL BACKEND
// ============================================

interface IAsignaturaPaginadaResponse {
  content: CourserAnswerDTGOD[];
  page: number;
  limit: number;
  totalPages: number;
  totalElements: number;
}

interface CourserAnswerDTGOD {
  idAsignatura: number;
  codAsignatura: string;
  nombreAsignatura: string;
  idCompletoProfesor: number;
  nombreProfesor: string;
  descripcionAsignatura: string;
  secciones: SectionAnswerUpdateDTO[];
}

interface SectionAnswerUpdateDTO {
  idSeccion: number;
  idAsignatura: number;
  nombreSeccion: string;
  estadoSeccion: EstadoSeccion;
  idDocente: number;
  NombreCompletoDocente: string;
  capacidadMaxInscritos: number;
  cantInscritos: number;
  bloquesHorarios: BookTImeBlocksRequestDTO[]
  crearSala?: boolean;
}

interface BookTImeBlocksRequestDTO {
  numeroBloque: number;
  horaInicio: string;
  horaFin: string;
  diaSemana: DiaSemana;
  idSala: number;
  codSala: string;
  nombreSala: string;
}

interface CourseCreateDTO {
  codAsignatura: string;
  nombreAsignatura: string;
  idUsuarioGestorAsignatura: number;
  descripcionAsignatura: string;
}

interface CourseUpdateDTO {
  idAsignatura: number;
  codAsignatura: string;
  nombreAsignatura: string;
  idProfesor: number;
  nombreCompletoProfesor: string;
  descripcionAsignatura: string;
}

// ============================================
// TRANSFORMADORES: BACKEND → FRONTEND
// ============================================

/**
 * Transforma un bloque horario del backend al formato frontend
 */
const transformarBloqueHorario = (bloque: BookTImeBlocksRequestDTO): IBloqueHorario => {
  return {
    numeroBloque: bloque.numeroBloque || 0,
    horaInicio: bloque.horaInicio || '00:00',
    horaFin: bloque.horaFin || '00:00',
    diaSemana: bloque.diaSemana || 'LUNES',
    idSala: bloque.idSala || 0,
    codSala: bloque.codSala || 'SIN-COD',
    nombreSala: bloque.nombreSala || 'Sin sala'
  };
};

/**
 * Transforma una sección del backend al formato frontend
 */
const transformarSeccion = (seccion: SectionAnswerUpdateDTO): ISeccion => {
  return {
    id: seccion.idSeccion?.toString() || '0',
    numeroSeccion: seccion.nombreSeccion || 'Sin nombre',
    profesorAsignado: seccion.NombreCompletoDocente || 'Sin asignar',
    profesorAsignadoId: seccion.idDocente?.toString() || '0',
    capacidadMax: seccion.capacidadMaxInscritos || 0,
    cantInscritos: seccion.cantInscritos || 0,
    estado: seccion.estadoSeccion || 'ACTIVA',
    bloquesHorarios: seccion.bloquesHorarios?.map(transformarBloqueHorario) || []
  };
};

/**
 * Transforma una asignatura del backend al formato frontend
 */
const transformarAsignatura = (asignatura: CourserAnswerDTGOD): IAsignatura => {
  return {
    id: asignatura.idAsignatura?.toString() || '0',
    codigo: asignatura.codAsignatura || 'SIN-COD',
    nombre: asignatura.nombreAsignatura || 'Sin nombre',
    profesorACargoId: asignatura.idCompletoProfesor?.toString() || '0',
    profesorACargoNombre: asignatura.nombreProfesor || 'Sin asignar',
    descripcion: asignatura.descripcionAsignatura || '',
    secciones: asignatura.secciones?.map(transformarSeccion) || [],
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString()
  };
};

// ============================================
// SERVICIOS - ASIGNATURAS
// ============================================

/**
 * Obtener asignaturas activas paginadas (20 por página)
 * POST /v1/asignatura/find-all-courses-active-true/{page}
 */
export const obtenerAsignaturasService = async (
  page: number = 1
): Promise<{ asignaturas: IAsignatura[]; totalPages: number }> => {
  try {
    const response = await api.post<IAsignaturaPaginadaResponse>(
      `/asignatura/find-all-courses-active-true/${page}`
    );

    const content = response.data?.content;
    if (!content || !Array.isArray(content)) {
      return { asignaturas: [], totalPages: 1 };
    }

    return {
      asignaturas: content.map(transformarAsignatura),
      totalPages: response.data.totalPages ?? 1,
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener las asignaturas');
  }
};

/**
 * Obtener asignatura por ID
 */
export const obtenerAsignaturaPorIdService = async (id: string): Promise<IAsignatura | null> => {
  try {
    const { asignaturas } = await obtenerAsignaturasService(1);
    return asignaturas.find(a => a.id === id) || null;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener la asignatura');
  }
};

/**
 * Crear nueva asignatura
 * POST /v1/asignatura/create-course
 * Retorna true si fue exitoso
 */
export const crearAsignaturaService = async (data: IAsignaturaCreacion): Promise<boolean> => {
  try {
    const payload: CourseCreateDTO = {
      codAsignatura: data.codigo,
      nombreAsignatura: data.nombre,
      idUsuarioGestorAsignatura: parseInt(data.profesorACargoId),
      descripcionAsignatura: data.descripcion,
    };

    await api.post<boolean>('/asignatura/create-course', payload);
    return true;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al crear la asignatura');
  }
};

/**
 * Actualizar asignatura
 */
export const actualizarAsignaturaService = async (
  id: string,
  data: Partial<IAsignatura>
): Promise<IAsignatura> => {
  try {
    const payload: CourseUpdateDTO = {
      idAsignatura: parseInt(id),
      codAsignatura: data.codigo || '',
      nombreAsignatura: data.nombre || '',
      idProfesor: data.profesorACargoId ? parseInt(data.profesorACargoId) : 0,
      nombreCompletoProfesor: data.profesorACargoNombre || '',
      descripcionAsignatura: data.descripcion || ''
    };

    await api.put<CourseUpdateDTO>(
      '/asignatura/update-course/',
      payload
    );

    // Recargar la asignatura actualizada
    const asignaturaActualizada = await obtenerAsignaturaPorIdService(id);
    if (!asignaturaActualizada) {
      throw new Error('No se pudo encontrar la asignatura actualizada');
    }

    return asignaturaActualizada;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al actualizar la asignatura');
  }
};

/**
 * Eliminar asignatura (soft delete)
 */
export const eliminarAsignaturaService = async (id: string): Promise<void> => {
  try {
    await api.put(`/asignatura/soft-delete-course/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al eliminar la asignatura');
  }
};

// ============================================
// SERVICIOS - SECCIONES
// ============================================

/**
 * Agregar sección a una asignatura
 */
export const agregarSeccionService = async (
  asignaturaId: string,
  seccion: Omit<ISeccionCreacion, 'idAsignatura'>
): Promise<IAsignatura> => {
  try {
    const payload = {
      idAsignatura: parseInt(asignaturaId),
      nombreSeccion: seccion.nombreSeccion,
      idUsuarioDocente: seccion.idUsuarioDocente,
      capacidadMaxInscritos: seccion.capacidadMaxInscritos,
      cantInscritos: seccion.cantInscritos,
      estadoSeccion: seccion.estadoSeccion || 'ACTIVA',
      bloquesHorarios: seccion.bloquesHorarios,
      crearSala: seccion.crearSala || false
    };

    await api.post('/seccion/create-seccion-frontend/', payload);

    // Recargar la asignatura completa
    const asignaturaActualizada = await obtenerAsignaturaPorIdService(asignaturaId);
    if (!asignaturaActualizada) {
      throw new Error('No se pudo encontrar la asignatura actualizada');
    }

    return asignaturaActualizada;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al agregar la sección');
  }
};

/**
 * Actualizar sección completa (incluye bloques horarios)
 */
export const actualizarSeccionService = async (
  asignaturaId: string,
  seccionId: string,
  seccion: SectionAnswerUpdateDTO
): Promise<IAsignatura> => {
  try {
    const payload: SectionAnswerUpdateDTO = {
      idSeccion: parseInt(seccionId),
      idAsignatura: parseInt(asignaturaId),
      nombreSeccion: seccion.nombreSeccion,
      estadoSeccion: seccion.estadoSeccion,
      idDocente: seccion.idDocente,
      NombreCompletoDocente: seccion.NombreCompletoDocente || '',
      capacidadMaxInscritos: seccion.capacidadMaxInscritos,
      cantInscritos: seccion.cantInscritos,
      bloquesHorarios: seccion.bloquesHorarios,
      crearSala: seccion.crearSala || false
    };

    await api.put('/seccion/update-seccion/', payload);

    // Recargar la asignatura completa
    const asignaturaActualizada = await obtenerAsignaturaPorIdService(asignaturaId);
    if (!asignaturaActualizada) {
      throw new Error('No se pudo encontrar la asignatura actualizada');
    }

    return asignaturaActualizada;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al actualizar la sección');
  }
};

/**
 * Eliminar sección (soft delete)
 */
export const eliminarSeccionService = async (
  asignaturaId: string,
  seccionId: string
): Promise<IAsignatura> => {
  try {
    await api.put(`/seccion/soft-delete/${seccionId}`);

    // Recargar la asignatura completa
    const asignaturaActualizada = await obtenerAsignaturaPorIdService(asignaturaId);
    if (!asignaturaActualizada) {
      throw new Error('No se pudo encontrar la asignatura actualizada');
    }

    return asignaturaActualizada;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al eliminar la sección');
  }
};

/**
 * Calcular total de alumnos de una asignatura
 */
export const calcularTotalAlumnosService = async (asignaturaId: string): Promise<number> => {
  try {
    const asignatura = await obtenerAsignaturaPorIdService(asignaturaId);
    if (!asignatura) return 0;

    return asignatura.secciones
      .filter(s => s.estado === 'ACTIVA')
      .reduce((sum, s) => sum + s.cantInscritos, 0);
  } catch (error) {
    return 0;
  }
};