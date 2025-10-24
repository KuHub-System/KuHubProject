/**
 * SERVICIO DE PRODUCTOS CON PERSISTENCIA REAL
 * Ahora usa storage-service para persistencia real
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

import {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerMovimientosPorProducto,
  crearMovimiento,
} from './storage-service';

import { obtenerUsuarioActualService } from './auth-service';

/**
 * Obtiene la lista de productos del inventario.
 * Ahora con persistencia real en localStorage
 * 
 * @returns {Promise<IProducto[]>} Promesa que resuelve a la lista de productos.
 */
export const obtenerProductosService = async (): Promise<IProducto[]> => {
  console.log("📦 Obteniendo productos del inventario");
  
  // Simulamos un tiempo de respuesta para mantener la UX
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const productos = obtenerProductos();
  
  console.log(`✅ ${productos.length} productos encontrados`);
  return productos;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/productos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) {
      throw new Error('Error al obtener los productos');
    }

    const data: IProducto[] = await respuesta.json();
    return data;
  } catch (error) {
    console.error('Error en el servicio de productos:', error);
    throw error;
  }
  */
};

/**
 * Obtiene un producto por su ID.
 * 
 * @param {string} id - ID del producto.
 * @returns {Promise<IProducto>} Promesa que resuelve al producto.
 */
export const obtenerProductoPorIdService = async (id: string): Promise<IProducto> => {
  console.log(`🔍 Buscando producto con ID: ${id}`);
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const producto = obtenerProductoPorId(id);
  
  if (!producto) {
    throw new Error(`Producto con ID ${id} no encontrado`);
  }
  
  console.log(`✅ Producto encontrado: ${producto.nombre}`);
  return producto;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/productos/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) {
      throw new Error(`Error al obtener el producto con ID ${id}`);
    }

    const data: IProducto = await respuesta.json();
    return data;
  } catch (error) {
    console.error('Error en el servicio de productos:', error);
    throw error;
  }
  */
};

/**
 * Crea un nuevo producto.
 * Ahora persiste realmente en localStorage
 * 
 * @param {ICrearProducto} productoData - Datos del producto a crear.
 * @returns {Promise<IProducto>} Promesa que resuelve al producto creado.
 */
export const crearProductoService = async (productoData: ICrearProducto): Promise<IProducto> => {
  console.log("➕ Creando nuevo producto:", productoData.nombre);
  
  // Validaciones
  if (!productoData.nombre || productoData.nombre.trim() === '') {
    throw new Error('El nombre del producto es requerido');
  }
  
  if (productoData.stock < 0) {
    throw new Error('El stock no puede ser negativo');
  }
  
  if (productoData.stockMinimo < 0) {
    throw new Error('El stock mínimo no puede ser negativo');
  }
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const nuevoProducto = crearProducto(productoData);
  
  console.log(`✅ Producto creado exitosamente: ${nuevoProducto.nombre} (ID: ${nuevoProducto.id})`);
  return nuevoProducto;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/productos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productoData),
    });

    if (!respuesta.ok) {
      throw new Error('Error al crear el producto');
    }

    const data: IProducto = await respuesta.json();
    return data;
  } catch (error) {
    console.error('Error en el servicio de productos:', error);
    throw error;
  }
  */
};

/**
 * Actualiza un producto existente.
 * Ahora persiste realmente en localStorage
 * 
 * @param {IActualizarProducto} productoData - Datos del producto a actualizar.
 * @returns {Promise<IProducto>} Promesa que resuelve al producto actualizado.
 */
export const actualizarProductoService = async (productoData: IActualizarProducto): Promise<IProducto> => {
  console.log(`✏️ Actualizando producto ID: ${productoData.id}`);
  
  // Validaciones
  if (productoData.stock !== undefined && productoData.stock < 0) {
    throw new Error('El stock no puede ser negativo');
  }
  
  if (productoData.stockMinimo !== undefined && productoData.stockMinimo < 0) {
    throw new Error('El stock mínimo no puede ser negativo');
  }
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const { id, ...cambios } = productoData;
  const productoActualizado = actualizarProducto(id, cambios);
  
  if (!productoActualizado) {
    throw new Error(`Producto con ID ${id} no encontrado`);
  }
  
  console.log(`✅ Producto actualizado: ${productoActualizado.nombre}`);
  return productoActualizado;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/productos/${productoData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productoData),
    });

    if (!respuesta.ok) {
      throw new Error(`Error al actualizar el producto con ID ${productoData.id}`);
    }

    const data: IProducto = await respuesta.json();
    return data;
  } catch (error) {
    console.error('Error en el servicio de productos:', error);
    throw error;
  }
  */
};

/**
 * Elimina un producto.
 * Ahora elimina realmente de localStorage
 * 
 * @param {string} id - ID del producto a eliminar.
 * @returns {Promise<boolean>} Promesa que resuelve a true si la eliminación fue exitosa.
 */
export const eliminarProductoService = async (id: string): Promise<boolean> => {
  console.log(`🗑️ Eliminando producto ID: ${id}`);
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const eliminado = eliminarProducto(id);
  
  if (!eliminado) {
    throw new Error(`Producto con ID ${id} no encontrado`);
  }
  
  console.log(`✅ Producto eliminado exitosamente`);
  return true;

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/productos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) {
      throw new Error(`Error al eliminar el producto con ID ${id}`);
    }

    return true;
  } catch (error) {
    console.error('Error en el servicio de productos:', error);
    throw error;
  }
  */
};

/**
 * Obtiene los movimientos de un producto.
 * Ahora con paginación real sobre datos persistentes
 * 
 * @param {string} productoId - ID del producto.
 * @param {number} pagina - Número de página.
 * @param {number} limite - Cantidad de elementos por página.
 * @returns {Promise<{ movimientos: IMovimientoProducto[], total: number }>} Promesa que resuelve a los movimientos y el total.
 */
export const obtenerMovimientosProductoService = async (
  productoId: string,
  pagina: number = 1,
  limite: number = 10
): Promise<{ movimientos: IMovimientoProducto[], total: number }> => {
  console.log(`📋 Obteniendo movimientos del producto ${productoId} - Página ${pagina}`);
  
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

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/productos/${productoId}/movimientos?pagina=${pagina}&limite=${limite}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) {
      throw new Error(`Error al obtener los movimientos del producto con ID ${productoId}`);
    }

    const data = await respuesta.json();
    return data;
  } catch (error) {
    console.error('Error en el servicio de productos:', error);
    throw error;
  }
  */
};

/**
 * Crea un nuevo movimiento de producto.
 * Ahora actualiza el stock real del producto automáticamente
 * 
 * @param {ICrearMovimiento} movimientoData - Datos del movimiento a crear.
 * @returns {Promise<IMovimientoProducto>} Promesa que resuelve al movimiento creado.
 */
export const crearMovimientoService = async (movimientoData: ICrearMovimiento): Promise<IMovimientoProducto> => {
  console.log("📝 Creando movimiento:", movimientoData.tipo, movimientoData.cantidad);
  
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

  /*
  // --- MODO BACKEND (CUANDO ESTÉ LISTO) ---
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    
    const respuesta = await fetch(`${API_URL}/productos/movimientos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(movimientoData),
    });

    if (!respuesta.ok) {
      throw new Error('Error al crear el movimiento');
    }

    const data: IMovimientoProducto = await respuesta.json();
    return data;
  } catch (error) {
    console.error('Error en el servicio de productos:', error);
    throw error;
  }
  */
};