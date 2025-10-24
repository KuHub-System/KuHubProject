/**
 * SERVICIO DE RECETAS CON PERSISTENCIA REAL
 * 
 * Ubicación: src/services/receta-service.ts
 */

import { 
  IReceta, 
  ICrearReceta, 
  IActualizarReceta 
} from '../types/receta.types';

import {
  obtenerRecetas,
  obtenerRecetaPorId,
  crearReceta,
  actualizarReceta,
  eliminarReceta,
  obtenerRecetasActivas,
} from './storage-service';

/**
 * Obtiene todas las recetas.
 * @returns {Promise<IReceta[]>} Promesa que resuelve a la lista de recetas.
 */
export const obtenerRecetasService = async (): Promise<IReceta[]> => {
  console.log("📖 Obteniendo recetas");
  
  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const recetas = obtenerRecetas();
  
  console.log(`✅ ${recetas.length} recetas encontradas`);
  return recetas;
};

/**
 * Obtiene una receta por su ID.
 * @param {string} id - ID de la receta.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta.
 */
export const obtenerRecetaPorIdService = async (id: string): Promise<IReceta> => {
  console.log(`🔍 Buscando receta con ID: ${id}`);
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const receta = obtenerRecetaPorId(id);
  
  if (!receta) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }
  
  console.log(`✅ Receta encontrada: ${receta.nombre}`);
  return receta;
};

/**
 * Obtiene solo las recetas activas.
 * @returns {Promise<IReceta[]>} Promesa que resuelve a las recetas activas.
 */
export const obtenerRecetasActivasService = async (): Promise<IReceta[]> => {
  console.log("📖 Obteniendo recetas activas");
  
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const recetasActivas = obtenerRecetasActivas();
  
  console.log(`✅ ${recetasActivas.length} recetas activas encontradas`);
  return recetasActivas;
};

/**
 * Crea una nueva receta.
 * @param {ICrearReceta} recetaData - Datos de la receta a crear.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta creada.
 */
export const crearRecetaService = async (recetaData: ICrearReceta): Promise<IReceta> => {
  console.log("➕ Creando nueva receta:", recetaData.nombre);
  
  // Validaciones
  if (!recetaData.nombre || recetaData.nombre.trim() === '') {
    throw new Error('El nombre de la receta es requerido');
  }
  
  if (!recetaData.categoria || recetaData.categoria.trim() === '') {
    throw new Error('La categoría es requerida');
  }
  
  if (!recetaData.asignatura || recetaData.asignatura.trim() === '') {
    throw new Error('La asignatura es requerida');
  }
  
  if (recetaData.ingredientes.length === 0) {
    throw new Error('Debe agregar al menos un ingrediente');
  }
  
  // Validar que todos los ingredientes tengan datos válidos
  for (const ing of recetaData.ingredientes) {
    if (!ing.productoId || !ing.productoNombre) {
      throw new Error('Todos los ingredientes deben tener un producto seleccionado');
    }
    if (ing.cantidad <= 0) {
      throw new Error('La cantidad de cada ingrediente debe ser mayor a 0');
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Agregar IDs temporales a los ingredientes para que storage-service los genere correctamente
  const recetaConIngredientes = {
    ...recetaData,
    ingredientes: recetaData.ingredientes.map(ing => ({
      ...ing,
      id: '' // Storage service generará el ID real
    }))
  };
  
  const nuevaReceta = crearReceta(recetaConIngredientes);
  
  console.log(`✅ Receta creada exitosamente: ${nuevaReceta.nombre} (ID: ${nuevaReceta.id})`);
  return nuevaReceta;
};

/**
 * Actualiza una receta existente.
 * @param {IActualizarReceta} recetaData - Datos de la receta a actualizar.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta actualizada.
 */
export const actualizarRecetaService = async (recetaData: IActualizarReceta): Promise<IReceta> => {
  console.log(`✏️ Actualizando receta ID: ${recetaData.id}`);
  
  // Validaciones
  if (recetaData.ingredientes && recetaData.ingredientes.length === 0) {
    throw new Error('Debe tener al menos un ingrediente');
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { id, ...cambios } = recetaData;
  
  const recetaActualizada = actualizarReceta(id, cambios);
  
  if (!recetaActualizada) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }
  
  console.log(`✅ Receta actualizada: ${recetaActualizada.nombre}`);
  return recetaActualizada;
};

/**
 * Elimina una receta.
 * @param {string} id - ID de la receta a eliminar.
 * @returns {Promise<boolean>} Promesa que resuelve a true si la eliminación fue exitosa.
 */
export const eliminarRecetaService = async (id: string): Promise<boolean> => {
  console.log(`🗑️ Eliminando receta ID: ${id}`);
  
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const eliminado = eliminarReceta(id);
  
  if (!eliminado) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }
  
  console.log(`✅ Receta eliminada exitosamente`);
  return true;
};

/**
 * Cambia el estado de una receta (Activa/Inactiva).
 * @param {string} id - ID de la receta.
 * @param {boolean} activa - true para activar, false para desactivar.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta actualizada.
 */
export const cambiarEstadoRecetaService = async (id: string, activa: boolean): Promise<IReceta> => {
  console.log(`🔄 Cambiando estado de receta ID: ${id} a ${activa ? 'Activa' : 'Inactiva'}`);
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const recetaActualizada = actualizarReceta(id, { 
    estado: activa ? 'Activa' : 'Inactiva' 
  });
  
  if (!recetaActualizada) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }
  
  console.log(`✅ Estado actualizado`);
  return recetaActualizada;
};