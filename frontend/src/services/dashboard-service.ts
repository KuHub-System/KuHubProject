/**
 * SERVICIO DE DASHBOARD
 * Funciones compartidas para todos los tipos de dashboard
 */

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
 * NOTA: Los datos reales se cargan en el componente DashboardAdmin 
 * directamente desde los servicios correspondientes.
 */
export const cargarDashboardAdmin = async (): Promise<DashboardData> => {
  const productosData = obtenerProductos();
  const bajoStock = productosData.filter(p => p.stock <= p.stockMinimo);
  
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

/**
 * Cargar datos del dashboard para profesores
 */
export const cargarDashboardProfesor = async (): Promise<DashboardData> => {
  const productosData = obtenerProductos();
  const bajoStock = productosData.filter(p => p.stock <= p.stockMinimo);
  
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
