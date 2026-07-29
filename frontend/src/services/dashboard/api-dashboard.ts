/**
 * API SERVICE: DASHBOARD
 * Centraliza las llamadas al nuevo backend de analytics del dashboard.
 */

import api from '../../config/Axios';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface PieSlice {
  name: string;
  value: number;
  color: string;
}

export interface ProductoCritico {
  nombreProducto: string;
  stock: number;
  stockLimit: number;
  categoria: string;
  unidad: string;
}

export interface SolicitudRechazada {
  idSolicitud: number;
  motivo: string;
  fechaSolicitada: string;
  nombrePedidoSemanaBodega: string;
  nombreAsignatura: string;
  nombreSeccion: string;
  nombreDocente: string;
}

export interface DashboardAdminData {
  solicitudesToday: number;
  solicitudesWeek: number;
  solicitudesMonth: number;
  totalPedidos: number;
  productosBajoStock: number;
  usuariosActivos: number;
  solicitudesPendientes: number;
  solicitudesPorEstado: PieSlice[];
  solicitudesPorDia: ChartPoint[];
  pedidosPorSemana: ChartPoint[];
}

export interface DashboardInventarioData {
  totalProductos: number;
  stockTotal: number;
  productosBajoStock: number;
  movimientosHoy: number;
  productosCriticos: ProductoCritico[];
  stockPorCategoria: ChartPoint[];
  movimientosPorDia: ChartPoint[];
  topProductosUsados: ChartPoint[];
  topProductosMerma: ChartPoint[];
}

export interface DashboardGestorData {
  totalSolicitudes: number;
  pendientes: number;
  aceptadas: number;
  procesadas: number;
  rechazadas: number;
  enPedido: number;
  tiempoPromedioHoras: number;
  solicitudesPorAsignatura: ChartPoint[];
  solicitudesPorEstado: PieSlice[];
  rechazadasRecientes: SolicitudRechazada[];
}

export interface DashboardPedidoSemanalBodegaData {
  pedidoSemanaBodegasActivas: number;
  pedidoSemanaBodegasInactivas: number;
  pedidoSemanaBodegasTotal: number;
  topIngredientes: ChartPoint[];
  pedidoSemanaBodegasPorEstado: PieSlice[];
}

export const getDashboardAdmin      = (): Promise<DashboardAdminData>      => api.get('/dashboard/admin').then(r => r.data);
export const getDashboardInventario = (): Promise<DashboardInventarioData> => api.get('/dashboard/inventario').then(r => r.data);
export const getDashboardGestor     = (): Promise<DashboardGestorData>     => api.get('/dashboard/gestor').then(r => r.data);
export const getDashboardPedidoSemanalBodega = (): Promise<DashboardPedidoSemanalBodegaData> => api.get('/dashboard/pedidoSemanaBodegas').then(r => r.data);
