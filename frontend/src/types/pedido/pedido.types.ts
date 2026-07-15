/**
 * Tipos para la gestión de pedidos semanales.
 */

export type EstadoPedido = 'EnCurso' | 'Completado' | 'Cancelado';

export interface IPedido {
  id: string;
  semana: number;
  estado: EstadoPedido;
  fechaInicio: string;
  fechaCierre?: string;
  creadoPor: string;
  creadoPorNombre?: string;
  comentario?: string;
  solicitudesAsociadas: string[];
}

export interface IPedidoResumen extends IPedido {
  totalSolicitudes: number;
  totalPendientes: number;
  totalAceptadas: number;
  totalAceptadasModificadas: number;
  totalRechazadas: number;
}

