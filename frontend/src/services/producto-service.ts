/**
 * SERVICIO DE PRODUCTOS - ADAPTADO AL BACKEND
 * Ahora usa inventario-service para conectar con el backend real
 *
 * Ubicación: src/services/producto-service.ts
 */

import {
  IProducto,
  IMovimientoProducto,
  ICrearProducto,
  IActualizarProducto,
  ICrearMovimiento
} from '../types/producto.types';

// Importar el servicio real de inventario
import {
  obtenerProductosService as obtenerProductosBackend,
  obtenerProductoPorIdService as obtenerProductoPorIdBackend,
  crearProductoService as crearProductoBackend,
  actualizarProductoService as actualizarProductoBackend,
  eliminarProductoService as eliminarProductoBackend,
} from './inventario-service';

// Importar funciones locales solo para movimientos (hardcoded)
import {
  obtenerMovimientosPorProducto,
  crearMovimiento,
  obtenerMovimientos, // ✅ Importamos esto para el filtro general
} from './storage-service';

import { obtenerUsuarioActualService } from './auth-service';

/**
 * Obtiene la lista de productos del inventario desde el BACKEND REAL
 */
export const obtenerProductosService = async (): Promise<IProducto[]> => {
  return await obtenerProductosBackend();
};

/**
 * Obtiene un producto por su ID desde el BACKEND REAL
 */
export const obtenerProductoPorIdService = async (id: string): Promise<IProducto> => {
  return await obtenerProductoPorIdBackend(id);
};

/**
 * Crea un nuevo producto en el BACKEND REAL
 */
export const crearProductoService = async (productoData: ICrearProducto): Promise<IProducto> => {
  return await crearProductoBackend(productoData);
};

/**
 * Actualiza un producto existente en el BACKEND REAL
 */
export const actualizarProductoService = async (productoData: IActualizarProducto): Promise<IProducto> => {
  return await actualizarProductoBackend(productoData);
};

/**
 * Elimina un producto en el BACKEND REAL
 */
export const eliminarProductoService = async (id: string): Promise<boolean> => {
  return await eliminarProductoBackend(id);
};

/**
 * ========================================
 * MOVIMIENTOS - MANTIENEN LÓGICA LOCAL
 * ========================================
 */

/**
 * Filtros para la búsqueda de movimientos
 */
export interface IFiltrosMovimiento {
  productoId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  tipo?: 'Entrada' | 'Salida' | 'Merma';
  orden?: 'reciente' | 'antiguo' | 'cantidad_asc' | 'cantidad_desc';
}

/**
 * Obtiene los movimientos filtrados y paginados (LOCAL - HARDCODED)
 */
export const obtenerMovimientosFiltradosService = async (
  filtros: IFiltrosMovimiento,
  pagina: number = 1,
  limite: number = 10
): Promise<{ movimientos: IMovimientoProducto[], total: number }> => {
  console.log(`📋 Obteniendo movimientos filtrados`, filtros);

  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 400));

  // 1. Obtener todos los movimientos (sin filtrar)
  // Nota: Importamos obtenerMovimientos de storage-service (necesitamos agregarlo a los imports)
  const todosLosMovimientos = obtenerMovimientos();

  // 2. Aplicar filtros
  let movimientosFiltrados = [...todosLosMovimientos];

  // Filtro por Producto
  if (filtros.productoId && filtros.productoId !== 'todos') {
    movimientosFiltrados = movimientosFiltrados.filter(m => m.productoId === filtros.productoId);
  }

  // Filtro por Tipo
  if (filtros.tipo) {
    movimientosFiltrados = movimientosFiltrados.filter(m => m.tipo === filtros.tipo);
  }

  // Filtro por Fechas
  if (filtros.fechaInicio) {
    const inicio = new Date(filtros.fechaInicio).getTime();
    movimientosFiltrados = movimientosFiltrados.filter(m => new Date(m.fechaMovimiento).getTime() >= inicio);
  }
  if (filtros.fechaFin) {
    const fin = new Date(filtros.fechaFin).getTime();
    // Ajustar fin al final del día
    const fechaFin = new Date(filtros.fechaFin);
    fechaFin.setHours(23, 59, 59, 999);
    const finMs = fechaFin.getTime();
    movimientosFiltrados = movimientosFiltrados.filter(m => new Date(m.fechaMovimiento).getTime() <= finMs);
  }

  // 3. Ordenamiento
  movimientosFiltrados.sort((a, b) => {
    const fechaA = new Date(a.fechaMovimiento).getTime();
    const fechaB = new Date(b.fechaMovimiento).getTime();

    switch (filtros.orden) {
      case 'reciente':
        return fechaB - fechaA;
      case 'antiguo':
        return fechaA - fechaB;
      case 'cantidad_asc':
        return a.cantidad - b.cantidad;
      case 'cantidad_desc':
        return b.cantidad - a.cantidad;
      default:
        return fechaB - fechaA; // Default: más reciente primero
    }
  });

  // 4. Paginación
  const total = movimientosFiltrados.length;
  const inicio = (pagina - 1) * limite;
  const fin = inicio + limite;

  const movimientosPaginados = movimientosFiltrados.slice(inicio, fin);

  return {
    movimientos: movimientosPaginados,
    total
  };
};

/**
 * Obtiene los movimientos de un producto (Mantiene compatibilidad, usa el nuevo servicio)
 */
export const obtenerMovimientosProductoService = async (
  productoId: string,
  pagina: number = 1,
  limite: number = 10
): Promise<{ movimientos: IMovimientoProducto[], total: number }> => {
  return obtenerMovimientosFiltradosService(
    { productoId, orden: 'reciente' },
    pagina,
    limite
  );
};

/**
 * Crea un nuevo movimiento de producto (LOCAL - HARDCODED)
 */
export const crearMovimientoService = async (movimientoData: ICrearMovimiento): Promise<IMovimientoProducto> => {
  console.log("📝 Creando movimiento (LOCAL):", movimientoData.tipo, movimientoData.cantidad);

  // Validaciones
  if (movimientoData.cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  if (!movimientoData.observacion || movimientoData.observacion.trim() === '') {
    throw new Error('La observación es requerida');
  }

  // Obtener usuario actual
  const usuario = obtenerUsuarioActualService();
  const responsable = usuario ? usuario.nombreCompleto : 'Sistema';

  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 600));

  try {
    // Preparar los datos del movimiento sin el responsable
    const movimientoParaGuardar = {
      productoId: movimientoData.productoId,
      tipo: movimientoData.tipo,
      cantidad: movimientoData.cantidad,
      observacion: movimientoData.observacion,
    };

    const nuevoMovimiento = crearMovimiento(movimientoParaGuardar, responsable);

    if (!nuevoMovimiento) {
      throw new Error('Error al crear el movimiento');
    }

    console.log(`✅ Movimiento creado: ${movimientoData.tipo} de ${movimientoData.cantidad} unidades`);
    return nuevoMovimiento;
  } catch (error) {
    console.error('❌ Error al crear movimiento:', error);
    throw error;
  }
};