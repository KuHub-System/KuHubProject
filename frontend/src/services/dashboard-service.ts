/**
 * SERVICIO DE DASHBOARD
 * Funciones compartidas para todos los tipos de dashboard
 */

import { 
  obtenerTodasSolicitudesService,
  obtenerMisSolicitudesService,
  obtenerConteoSolicitudesService,
} from './solicitud-service';
import { obtenerProductos } from './storage-service';
import { IProducto } from '../types/producto.types';
import { ISolicitud } from '../types/solicitud.types';

/**
 * Estado del proceso de pedidos
 */
export interface EstadoProceso {
  activo: boolean;
  paso: number;
  semanaSeleccionada: number | null;
  pedidoId: string | null;
}

/**
 * Datos del dashboard
 */
export interface DashboardData {
  solicitudes: ISolicitud[];
  productos: IProducto[];
  productosBajoStock: IProducto[];
  conteoSolicitudes: {
    pendientes: number;
    aceptadas: number;
    rechazadas: number;
    total: number;
  };
}

/**
 * Obtener estado del proceso de pedidos
 */
export const obtenerEstadoProceso = (): EstadoProceso => {
  const procesoActivo = localStorage.getItem('procesoActivo');
  const semanaProceso = localStorage.getItem('procesoSemana');
  const currentStep = localStorage.getItem('currentStep');
  const pedidoId = localStorage.getItem('procesoPedidoId');
  
  return {
    activo: procesoActivo === 'true',
    paso: currentStep ? parseInt(currentStep) : 1,
    semanaSeleccionada: semanaProceso ? parseInt(semanaProceso, 10) : null,
    pedidoId: pedidoId || null,
  };
};

/**
 * Verificar si se pueden crear solicitudes
 */
export const puedenCrearseSolicitudes = (): boolean => {
  return true;
};

/**
 * Calcular días restantes del proceso
 */
export const calcularDiasRestantesProceso = (): number => {
  return 0;
};

/**
 * Cargar datos del dashboard para administradores
 */
export const cargarDashboardAdmin = async (): Promise<DashboardData> => {
  const [solicitudesData, conteo] = await Promise.all([
    obtenerTodasSolicitudesService(),
    obtenerConteoSolicitudesService(),
  ]);
  
  const productosData = obtenerProductos();
  const bajoStock = productosData.filter(p => p.stock <= p.stockMinimo);
  
  return {
    solicitudes: solicitudesData,
    productos: productosData,
    productosBajoStock: bajoStock,
    conteoSolicitudes: conteo,
  };
};

/**
 * Cargar datos del dashboard para profesores
 */
export const cargarDashboardProfesor = async (): Promise<DashboardData> => {
  // obtenerMisSolicitudesService ya filtra por el usuario actual
  const [solicitudesData, conteo] = await Promise.all([
    obtenerMisSolicitudesService(),
    obtenerConteoSolicitudesService(),
  ]);
  
  // Filtrar conteo para mostrar solo las del profesor
  const conteoProfesor = {
    pendientes: solicitudesData.filter(s => s.estado === 'Pendiente').length,
    aceptadas: solicitudesData.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada').length,
    rechazadas: solicitudesData.filter(s => s.estado === 'Rechazada').length,
    total: solicitudesData.length,
  };
  
  const productosData = obtenerProductos();
  const bajoStock = productosData.filter(p => p.stock <= p.stockMinimo);
  
  return {
    solicitudes: solicitudesData,
    productos: productosData,
    productosBajoStock: bajoStock,
    conteoSolicitudes: conteoProfesor,
  };
};

/**
 * Cargar datos del dashboard para bodega
 */
export const cargarDashboardBodega = async (): Promise<DashboardData> => {
  const productosData = obtenerProductos();
  const bajoStock = productosData.filter(p => p.stock <= p.stockMinimo);
  
  // Bodega no necesita solicitudes
  return {
    solicitudes: [],
    productos: productosData,
    productosBajoStock: bajoStock,
    conteoSolicitudes: {
      pendientes: 0,
      aceptadas: 0,
      rechazadas: 0,
      total: 0,
    },
  };
};

