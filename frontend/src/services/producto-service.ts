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
 * Obtiene los movimientos de un producto (LOCAL - HARDCODED)
 */
export const obtenerMovimientosProductoService = async (
    productoId: string,
    pagina: number = 1,
    limite: number = 10
): Promise<{ movimientos: IMovimientoProducto[], total: number }> => {
  console.log(`📋 Obteniendo movimientos del producto ${productoId} - Página ${pagina} (LOCAL)`);

  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 400));

  // Obtener todos los movimientos del producto
  const todosLosMovimientos = obtenerMovimientosPorProducto(productoId);

  // Calcular paginación
  const total = todosLosMovimientos.length;
  const inicio = (pagina - 1) * limite;
  const fin = inicio + limite;

  const movimientosPaginados = todosLosMovimientos.slice(inicio, fin);

  console.log(`✅ ${movimientosPaginados.length} movimientos de ${total} totales`);

  return {
    movimientos: movimientosPaginados,
    total
  };
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