/**
 * SERVICIO DE RECETAS CON PERSISTENCIA REAL
 * 
 * Ubicación: src/services/receta-service.ts
 */

import {
  IReceta,
  ICrearReceta,
  IActualizarReceta,
  IRecipeWithDetailsCreateDTO,
  IPaginatedRecetasResponse,
  IRecetaCountResponse
} from '../types/receta.types';

import api from '../config/Axios';

import {
  obtenerRecetas,
  obtenerRecetaPorId,
  crearReceta,
  actualizarReceta,
  eliminarReceta,
  obtenerRecetasActivas,
} from './storage-service';

/**
 * Obtiene las recetas con paginación desde el backend.
 * @param {number} page - El número de página (por defecto 1).
 * @returns {Promise<IPaginatedRecetasResponse>} Promesa que resuelve la repuesta paginada.
 */
export const obtenerRecetasPaginadasService = async (page: number = 1): Promise<IPaginatedRecetasResponse> => {
  try {
    const response = await api.post<IPaginatedRecetasResponse>(`/receta/find-all-recipes-pagined/${page}`);
    return response.data;
  } catch (error: any) {
    console.error('Error al obtener recetas paginadas', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al obtener receta paginada'
    );
  }
};

/**
 * Busca recetas por término (nombre o descripción) con paginación.
 * @param {string} term - Término de búsqueda.
 * @param {number} page - Número de página.
 * @returns {Promise<IPaginatedRecetasResponse>}
 */
export const buscarRecetasPaginadasService = async (term: string, page: number = 1): Promise<IPaginatedRecetasResponse> => {
  try {
    const response = await api.post<IPaginatedRecetasResponse>('/receta/search-recipes', { term, page });
    return response.data;
  } catch (error: any) {
    console.error('Error al buscar recetas paginadas', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al buscar recetas'
    );
  }
};

/**
 * Obtiene todas las recetas.
 * @returns {Promise<IReceta[]>} Promesa que resuelve a la lista de recetas.
 */
export const obtenerRecetasService = async (): Promise<IReceta[]> => {

  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 400));

  const recetas = obtenerRecetas();

  return recetas;
};

/**
 * Obtiene una receta por su ID.
 * @param {string} id - ID de la receta.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta.
 */
export const obtenerRecetaPorIdService = async (id: string): Promise<IReceta> => {

  await new Promise(resolve => setTimeout(resolve, 300));

  const receta = obtenerRecetaPorId(id);

  if (!receta) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }

  return receta;
};

/**
 * Obtiene solo las recetas activas.
 * @returns {Promise<IReceta[]>} Promesa que resuelve a las recetas activas.
 */
export const obtenerRecetasActivasService = async (): Promise<IReceta[]> => {

  await new Promise(resolve => setTimeout(resolve, 400));

  const recetasActivas = obtenerRecetasActivas();

  return recetasActivas;
};

/**
 * Crea una nueva receta.
 * @param {ICrearReceta} recetaData - Datos de la receta a crear.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta creada.
 */
export const crearRecetaService = async (recetaData: ICrearReceta): Promise<IReceta> => {

  // Validaciones
  if (!recetaData.nombre || recetaData.nombre.trim() === '') {
    throw new Error('El nombre de la receta es requerido');
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

  return nuevaReceta;
};

/**
 * Actualiza una receta existente.
 * @param {IActualizarReceta} recetaData - Datos de la receta a actualizar.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta actualizada.
 */
export const actualizarRecetaService = async (recetaData: IActualizarReceta): Promise<IReceta> => {

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

  return recetaActualizada;
};

/**
 * Crea una receta llamando al backend con el formato detallado.
 * @param {IRecipeWithDetailsCreateDTO} data - DTO con los detalles de la receta.
 * @returns {Promise<boolean>} Promesa que resuelve a true si se creó correctamente.
 */
export const crearRecetaConDetallesService = async (data: IRecipeWithDetailsCreateDTO): Promise<boolean> => {
  try {
    const response = await api.post<boolean>('/receta/create-recipe-with-details', data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al crear la receta en el servidor'
    );
  }
};

/**
 * Elimina una receta.
 * @param {string} id - ID de la receta a eliminar.
 * @returns {Promise<boolean>} Promesa que resuelve a true si la eliminación fue exitosa.
 */
export const eliminarRecetaService = async (id: string): Promise<boolean> => {

  await new Promise(resolve => setTimeout(resolve, 400));

  const eliminado = eliminarReceta(id);

  if (!eliminado) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }

  return true;
};

/**
 * Cambia el estado de una receta (Activa/Inactiva).
 * @param {string} id - ID de la receta.
 * @param {boolean} activa - true para activar, false para desactivar.
 * @returns {Promise<IReceta>} Promesa que resuelve a la receta actualizada.
 */
export const cambiarEstadoRecetaService = async (id: string, activa: boolean): Promise<IReceta> => {

  await new Promise(resolve => setTimeout(resolve, 300));

  const recetaActualizada = actualizarReceta(id, {
    estado: activa ? 'Activo' : 'Inactivo'
  });

  if (!recetaActualizada) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }

  return recetaActualizada;
};

/**
 * Obtiene el conteo total de recetas (activas, inactivas y total).
 * @returns {Promise<IRecetaCountResponse>}
 */
export const obtenerRecetasCountService = async (): Promise<IRecetaCountResponse> => {
  try {
    const response = await api.get<IRecetaCountResponse>('/receta/count-recipes');
    return response.data;
  } catch (error: any) {
    console.error('Error al obtener el conteo de recetas', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al obtener el conteo de recetas'
    );
  }
};