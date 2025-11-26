/**
 * TIPOS PARA ASIGNATURAS Y SECCIONES
 */

/**
 * Cantidades permitidas de alumnos por sección
 */
export const CANTIDADES_ALUMNOS_PERMITIDAS = [5, 10, 15, 20, 25, 40] as const;

export type CantidadAlumnos = typeof CANTIDADES_ALUMNOS_PERMITIDAS[number];

/**
 * Estado de una sección
 */
export type EstadoSeccion = 'Activa' | 'Inactiva' | 'Suspendida';

/**
 * Interfaz para una sección de asignatura
 */
export interface ISeccion {
  id: string;
  numeroSeccion: string;
  profesorAsignado: string;
  horario: string;
  aula: string;
  cantidadAlumnos: CantidadAlumnos; // Cantidad específica de alumnos (5/10/15/20/25/40)
  estado: EstadoSeccion;
}

/**
 * Interfaz para una asignatura
 */
export interface IAsignatura {
  id: string;
  codigo: string;
  nombre: string;
  profesorACargoId: string; // ID del usuario profesor a cargo
  profesorACargoNombre: string; // Nombre del profesor a cargo
  creditos: number;
  semestre: string;
  departamento: string;
  descripcion: string;
  secciones: ISeccion[];
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Interfaz para crear una asignatura
 */
export interface IAsignaturaCreacion {
  codigo: string;
  nombre: string;
  profesorACargoId: string;
  profesorACargoNombre: string;
  creditos: number;
  semestre: string;
  departamento: string;
  descripcion: string;
  secciones?: Omit<ISeccion, 'id'>[];
}

/**
 * Interfaz para actualizar una asignatura
 */
export interface IAsignaturaActualizacion {
  codigo?: string;
  nombre?: string;
  profesorACargoId?: string;
  profesorACargoNombre?: string;
  creditos?: number;
  semestre?: string;
  departamento?: string;
  descripcion?: string;
}

