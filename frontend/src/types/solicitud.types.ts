/**
 * TIPOS DE SOLICITUDES ACTUALIZADOS CON SISTEMA DE APROBACIÓN
 */

export type EstadoSolicitud = 'Pendiente' | 'Aceptada' | 'AceptadaModificada' | 'Rechazada';

export interface IItemSolicitud {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
  esAdicional: boolean; // true si fue agregado manualmente, false si viene de receta
}

export interface ISolicitud {
  id: string;
  profesorId: string;
  profesorNombre: string;
  asignaturaId: string;
  asignaturaNombre: string;
  semana: number; // Semana académica (1-18)
  fecha: string; // Fecha de la clase
  recetaId: string | null;
  recetaNombre: string | null;
  items: IItemSolicitud[];
  observaciones: string;
  esCustom: boolean; // true si tiene modificaciones sobre la receta base
  estado: EstadoSolicitud;
  comentarioRechazo?: string; // Solo si estado es 'Rechazada'
  fechaCreacion: string;
  fechaUltimaModificacion: string;
  fechaAprobacion?: string;
  aprobadoPor?: string; // ID del admin que aprobó/rechazó
  comentarioAdministrador?: string;
}

export interface ISolicitudCreacion {
  asignaturaId: string;
  asignaturaNombre: string;
  semana: number;
  fecha: string;
  recetaId: string | null;
  recetaNombre: string | null;
  items: Omit<IItemSolicitud, 'id'>[];
  observaciones: string;
  esCustom: boolean;
}

export interface ISolicitudActualizacion {
  asignaturaId?: string;
  asignaturaNombre?: string;
  semana?: number;
  fecha?: string;
  recetaId?: string | null;
  recetaNombre?: string | null;
  items?: IItemSolicitud[];
  observaciones?: string;
  esCustom?: boolean;
}

export interface IAprobarRechazarSolicitud {
  solicitudId: string;
  estado: 'Aceptada' | 'AceptadaModificada' | 'Rechazada';
  comentarioRechazo?: string;
  comentarioAdministrador?: string;
  aprobadoPor: string; // ID del admin
  actualizacion?: ISolicitudActualizacion;
}

/**
 * Filtros para gestión de solicitudes
 */
export interface IFiltrosSolicitudes {
  estado?: EstadoSolicitud;
  profesorId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  semana?: number;
}