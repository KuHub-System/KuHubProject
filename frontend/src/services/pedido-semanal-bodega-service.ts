/**
 * SERVICIO DE RECETAS CON PERSISTENCIA REAL
 * 
 * Ubicación: src/services/receta-service.ts
 */

import {
  IPedidoSemanaBodega,
  ICrearPedidoSemanaBodega,
  IActualizarPedidoSemanaBodega,
  IPedidoSemanaBodegaWithDetailsCreateDTO,
  IPedidoSemanaBodegaWithDetailsUpdateDTO,
  IPaginatedPedidoSemanaBodegaResponse,
  IPedidoSemanaBodegaCountResponse,
  IImportarExcelResultado,
  IAsignatura
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
 * @param {number} idSemana - ID de la semana para filtrar (opcional).
 * @param {number} idAsignatura - ID de la asignatura para filtrar (opcional).
 * @returns {Promise<IPaginatedPedidoSemanaBodegaResponse>} Promesa que resuelve la repuesta paginada.
 */
export const obtenerRecetasPaginadasService = async (page: number = 1, idSemana?: number, idAsignatura?: number): Promise<IPaginatedPedidoSemanaBodegaResponse> => {
  try {
    const params = new URLSearchParams();
    if (idSemana) params.append('idSemana', idSemana.toString());
    if (idAsignatura) params.append('idAsignatura', idAsignatura.toString());
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const response = await api.post<IPaginatedPedidoSemanaBodegaResponse>(`/pedido-semana-bodega/find-all-recipes-pagined/${page}${queryStr}`);
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
 * @param {number} idSemana - ID de la semana para filtrar (opcional).
 * @param {number} idAsignatura - ID de la asignatura para filtrar (opcional).
 * @returns {Promise<IPaginatedPedidoSemanaBodegaResponse>}
 */
export const buscarRecetasPaginadasService = async (term: string, page: number = 1, idSemana?: number, idAsignatura?: number): Promise<IPaginatedPedidoSemanaBodegaResponse> => {
  try {
    const response = await api.post<IPaginatedPedidoSemanaBodegaResponse>('/pedido-semana-bodega/search-recipes', { term, page, idSemana, idAsignatura });
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
 * @returns {Promise<IPedidoSemanaBodega[]>} Promesa que resuelve a la lista de recetas.
 */
export const obtenerRecetasService = async (): Promise<IPedidoSemanaBodega[]> => {

  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 400));

  const recetas = obtenerRecetas();

  return recetas;
};

/**
 * Obtiene una receta por su ID.
 * @param {string} id - ID de la receta.
 * @returns {Promise<IPedidoSemanaBodega>} Promesa que resuelve a la receta.
 */
export const obtenerRecetaPorIdService = async (id: string): Promise<IPedidoSemanaBodega> => {

  await new Promise(resolve => setTimeout(resolve, 300));

  const receta = obtenerRecetaPorId(id);

  if (!receta) {
    throw new Error(`Receta con ID ${id} no encontrada`);
  }

  return receta;
};

/**
 * Obtiene solo las recetas activas.
 * @returns {Promise<IPedidoSemanaBodega[]>} Promesa que resuelve a las recetas activas.
 */
export const obtenerRecetasActivasService = async (): Promise<IPedidoSemanaBodega[]> => {

  await new Promise(resolve => setTimeout(resolve, 400));

  const recetasActivas = obtenerRecetasActivas();

  return recetasActivas;
};

/**
 * Crea una nueva receta.
 * @param {ICrearPedidoSemanaBodega} recetaData - Datos de la receta a crear.
 * @returns {Promise<IPedidoSemanaBodega>} Promesa que resuelve a la receta creada.
 */
export const crearRecetaService = async (recetaData: ICrearPedidoSemanaBodega): Promise<IPedidoSemanaBodega> => {

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
 * @param {IActualizarPedidoSemanaBodega} recetaData - Datos de la receta a actualizar.
 * @returns {Promise<IPedidoSemanaBodega>} Promesa que resuelve a la receta actualizada.
 */
export const actualizarRecetaService = async (recetaData: IActualizarPedidoSemanaBodega): Promise<IPedidoSemanaBodega> => {

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
 * @param {IPedidoSemanaBodegaWithDetailsCreateDTO} data - DTO con los detalles de la receta.
 * @returns {Promise<boolean>} Promesa que resuelve a true si se creó correctamente.
 */
export const crearRecetaConDetallesService = async (data: IPedidoSemanaBodegaWithDetailsCreateDTO): Promise<boolean> => {
  try {
    const response = await api.post<boolean>('/pedido-semana-bodega/create-recipe-with-details', data);
    return response.data;
  } catch (error: any) {
    const err = new Error(
      error.response?.data?.message ||
      'Error al crear la receta en el servidor'
    ) as Error & { status?: number };
    err.status = error.response?.status;
    throw err;
  }
};

/**
 * Actualiza una receta con detalles mediante deltas (newItems, updateItems, deleteItems).
 * @param {IPedidoSemanaBodegaWithDetailsUpdateDTO} data - DTO con los cambios de la receta.
 * @returns {Promise<boolean>} Promesa que resuelve a true si se actualizó correctamente.
 */
export const actualizarRecetaConDetallesService = async (data: IPedidoSemanaBodegaWithDetailsUpdateDTO): Promise<boolean> => {
  try {
    const response = await api.patch<boolean>('/pedido-semana-bodega/update-recipe-with-details', data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al actualizar la receta en el servidor'
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
 * Cambia el estado de una receta (Activo/Inactivo) mediante el backend.
 * @param {string} id - ID de la receta.
 * @returns {Promise<boolean>} Promesa que resuelve a true si el cambio fue exitoso.
 */
export const cambiarEstadoRecetaService = async (id: string): Promise<boolean> => {
  try {
    const idNumero = parseInt(id, 10);
    const response = await api.patch<boolean>(`/pedido-semana-bodega/change-status/${idNumero}`);
    return response.data;
  } catch (error: any) {
    console.error('Error al cambiar el estado de la receta', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al cambiar el estado de la receta'
    );
  }
};

/**
 * Elimina (soft delete) una receta por su ID.
 * @param {number} idReceta - ID numérico de la receta.
 * @returns {Promise<boolean>} Promesa que resuelve a true si la eliminación fue exitosa (204).
 */
export const softDeleteRecetaService = async (idReceta: number): Promise<boolean> => {
  try {
    await api.delete(`/pedido-semana-bodega/soft-delete-receta/${idReceta}`);
    return true;
  } catch (error: any) {
    console.error('Error al eliminar la receta', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al eliminar la receta'
    );
  }
};

/**
 * Envía un archivo Excel (.xlsx/.xlsm) al backend para cruzar los nombres
 * de productos contra la BD y precargar el formulario de Nuevo Pedido Semanal.
 * @param {File} archivo - Archivo con el listado de pedido (filas 12-80, col A=nombre, D=cantidad, E=observación).
 * @returns {Promise<IImportarExcelResultado>} Productos encontrados y no encontrados.
 */
export const importarExcelPedidoService = async (archivo: File, nombreHoja?: string): Promise<IImportarExcelResultado> => {
  try {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const params = nombreHoja ? `?nombreHoja=${encodeURIComponent(nombreHoja)}` : '';
    const response = await api.post<IImportarExcelResultado>(
      `/pedido-semana-bodega/importar-excel${params}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error al importar Excel', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al procesar el archivo Excel'
    );
  }
};

/**
 * Obtiene el conteo total de recetas (activas, inactivas y total).
 * @returns {Promise<IPedidoSemanaBodegaCountResponse>}
 */
export const obtenerRecetasCountService = async (): Promise<IPedidoSemanaBodegaCountResponse> => {
  try {
    const response = await api.get<IPedidoSemanaBodegaCountResponse>('/pedido-semana-bodega/count-recipes');
    return response.data;
  } catch (error: any) {
    console.error('Error al obtener el conteo de recetas', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al obtener el conteo de recetas'
    );
  }
};

/**
 * Obtiene todas las asignaturas activas para el selector del modal de pedido semanal.
 * @returns {Promise<IAsignatura[]>}
 */
export const obtenerAsignaturasActivasService = async (): Promise<IAsignatura[]> => {
  const response = await api.get<IAsignatura[]>('/pedido-semana-bodega/asignaturas/activas');
  return response.data;
};

