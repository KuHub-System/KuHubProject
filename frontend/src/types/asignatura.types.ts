/**
 * TIPOS PARA ASIGNATURAS Y SECCIONES
 * Actualizados para coincidir con el backend
 */

/**
 * Enum para días de la semana (coincide con backend)
 */
export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

/**
 * Estado de una sección (coincide con backend)
 */
export type EstadoSeccion = 'ACTIVA' | 'INACTIVA' | 'SUSPENDIDA';

/**
 * Interfaz para un bloque horario con sala
 */
export interface IBloqueHorario {
  numeroBloque: number;
  horaInicio: string; // "08:00"
  horaFin: string;    // "10:00"
  diaSemana: DiaSemana;
  idSala: number;
  codSala: string;
  nombreSala: string;
}

/**
 * Interfaz para una sección de asignatura
 */
export interface ISeccion {
  id: string; // idSeccion convertido a string
  numeroSeccion: string; // nombreSeccion del backend
  profesorAsignado: string; // nombreCompletoDocente del backend
  profesorAsignadoId: string; // idDocente convertido a string
  capacidadMax: number; // capacidadMaxInscritos del backend
  cantInscritos: number; // cantInscritos del backend
  estado: EstadoSeccion; // estadoSeccion del backend (ya es enum)
  bloquesHorarios: IBloqueHorario[]; // array de bloques con salas
}

/**
 * Interfaz para una asignatura
 */
export interface IAsignatura {
  id: string; // idAsignatura convertido a string
  codigo: string; // codAsignatura
  nombre: string; // nombreAsignatura
  profesorACargoId: string; // idCompletoProfesor convertido a string
  profesorACargoNombre: string; // nombreProfesor
  descripcion: string; // descripcionAsignatura
  secciones: ISeccion[];
  // Campos removidos: creditos, semestre, departamento
  fechaCreacion?: string; // Opcional, no viene del backend
  fechaActualizacion?: string; // Opcional, no viene del backend
}

/**
 * Interfaz para crear una asignatura (para POST)
 */
export interface IAsignaturaCreacion {
  codigo: string;
  nombre: string;
  profesorACargoId: string; // Se envía como idProfesor al backend
  descripcion: string;
}

/**
 * Interfaz para actualizar una asignatura (para PUT)
 */
export interface IAsignaturaActualizacion {
  idAsignatura: number;
  codigo: string;
  nombre: string;
  profesorACargoId: string; // Se envía como idProfesor al backend
  descripcion: string;
}

/**
 * Interfaz para crear una sección
 */
export interface ISeccionCreacion {
  idAsignatura: number;
  nombreSeccion: string;
  idUsuarioDocente: number;
  capacidadMaxInscritos: number;
  cantInscritos: number;
  estadoSeccion?: EstadoSeccion;
  bloquesHorarios: {
    numeroBloque: number;
    diaSemana: DiaSemana;
    idSala?: number; // Opcional si se va a crear sala
    codSala?: string; // Para crear sala nueva
    nombreSala?: string; // Para crear sala nueva
  }[];
  crearSala?: boolean;
}

/**
 * Interfaz para actualizar una sección
 */
export interface ISeccionActualizacion {
  idSeccion: number;
  nombreSeccion?: string;
  idUsuarioDocente?: number;
  capacidadMaxInscritos?: number;
  cantInscritos?: number;
  estadoSeccion?: EstadoSeccion;
}