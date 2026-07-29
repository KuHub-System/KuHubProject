/**
 * SERVICIO DE PEDIDO_SEMANAL_BODEGAS CON PERSISTENCIA REAL
 * 
 * Ubicación: src/services/pedidoSemanaBodega-service.ts
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
} from '../../types/pedido/pedidoSemanaBodega.types';

import api from '../../config/Axios';

import {
  obtenerPedidoSemanaBodegas,
  obtenerPedidoSemanaBodegaPorId,
  crearPedidoSemanaBodega,
  actualizarPedidoSemanaBodega,
  eliminarPedidoSemanaBodega,
  obtenerPedidoSemanaBodegasActivas,
} from '../shared/storage-service';

/**
 * Obtiene las pedidoSemanaBodegas con paginación desde el backend.
 * @param {number} page - El número de página (por defecto 1).
 * @param {number} idSemana - ID de la semana para filtrar (opcional).
 * @param {number} idAsignatura - ID de la asignatura para filtrar (opcional).
 * @returns {Promise<IPaginatedPedidoSemanaBodegaResponse>} Promesa que resuelve la repuesta paginada.
 */
export const obtenerPedidoSemanaBodegasPaginadasService = async (page: number = 1, idSemana?: number, idAsignatura?: number, estadoPedido?: string): Promise<IPaginatedPedidoSemanaBodegaResponse> => {
  try {
    const params = new URLSearchParams();
    if (idSemana) params.append('idSemana', idSemana.toString());
    if (idAsignatura) params.append('idAsignatura', idAsignatura.toString());
    if (estadoPedido) params.append('estadoPedido', estadoPedido);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const response = await api.post<IPaginatedPedidoSemanaBodegaResponse>(`/pedido-semana-bodega/find-all-recipes-pagined/${page}${queryStr}`);
    return response.data;
  } catch (error: any) {
    console.error('Error al obtener pedidoSemanaBodegas paginadas', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al obtener pedidoSemanaBodega paginada'
    );
  }
};

/**
 * Busca pedidoSemanaBodegas por término (nombre o descripción) con paginación.
 * @param {string} term - Término de búsqueda.
 * @param {number} page - Número de página.
 * @param {number} idSemana - ID de la semana para filtrar (opcional).
 * @param {number} idAsignatura - ID de la asignatura para filtrar (opcional).
 * @returns {Promise<IPaginatedPedidoSemanaBodegaResponse>}
 */
export const buscarPedidoSemanaBodegasPaginadasService = async (term: string, page: number = 1, idSemana?: number, idAsignatura?: number, estadoPedido?: string): Promise<IPaginatedPedidoSemanaBodegaResponse> => {
  try {
    const response = await api.post<IPaginatedPedidoSemanaBodegaResponse>('/pedido-semana-bodega/search-recipes', { term, page, idSemana, idAsignatura, estadoPedido });
    return response.data;
  } catch (error: any) {
    console.error('Error al buscar pedidoSemanaBodegas paginadas', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al buscar pedidoSemanaBodegas'
    );
  }
};

/**
 * Obtiene todas las pedidoSemanaBodegas.
 * @returns {Promise<IPedidoSemanaBodega[]>} Promesa que resuelve a la lista de pedidoSemanaBodegas.
 */
export const obtenerPedidoSemanaBodegasService = async (): Promise<IPedidoSemanaBodega[]> => {

  // Simulamos un tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 400));

  const pedidoSemanaBodegas = obtenerPedidoSemanaBodegas();

  return pedidoSemanaBodegas;
};

/**
 * Obtiene una pedidoSemanaBodega por su ID.
 * @param {string} id - ID de la pedidoSemanaBodega.
 * @returns {Promise<IPedidoSemanaBodega>} Promesa que resuelve a la pedidoSemanaBodega.
 */
export const obtenerPedidoSemanaBodegaPorIdService = async (id: string): Promise<IPedidoSemanaBodega> => {

  await new Promise(resolve => setTimeout(resolve, 300));

  const pedidoSemanaBodega = obtenerPedidoSemanaBodegaPorId(id);

  if (!pedidoSemanaBodega) {
    throw new Error(`PedidoSemanaBodega con ID ${id} no encontrada`);
  }

  return pedidoSemanaBodega;
};

/**
 * Obtiene solo las pedidoSemanaBodegas activas.
 * @returns {Promise<IPedidoSemanaBodega[]>} Promesa que resuelve a las pedidoSemanaBodegas activas.
 */
export const obtenerPedidoSemanaBodegasActivasService = async (): Promise<IPedidoSemanaBodega[]> => {

  await new Promise(resolve => setTimeout(resolve, 400));

  const pedidoSemanaBodegasActivas = obtenerPedidoSemanaBodegasActivas();

  return pedidoSemanaBodegasActivas;
};

/**
 * Crea una nueva pedidoSemanaBodega.
 * @param {ICrearPedidoSemanaBodega} pedidoSemanaBodegaData - Datos de la pedidoSemanaBodega a crear.
 * @returns {Promise<IPedidoSemanaBodega>} Promesa que resuelve a la pedidoSemanaBodega creada.
 */
export const crearPedidoSemanaBodegaService = async (pedidoSemanaBodegaData: ICrearPedidoSemanaBodega): Promise<IPedidoSemanaBodega> => {

  // Validaciones
  if (!pedidoSemanaBodegaData.nombre || pedidoSemanaBodegaData.nombre.trim() === '') {
    throw new Error('El nombre de la pedidoSemanaBodega es requerido');
  }

  if (pedidoSemanaBodegaData.ingredientes.length === 0) {
    throw new Error('Debe agregar al menos un ingrediente');
  }

  // Validar que todos los ingredientes tengan datos válidos
  for (const ing of pedidoSemanaBodegaData.ingredientes) {
    if (!ing.productoId || !ing.productoNombre) {
      throw new Error('Todos los ingredientes deben tener un producto seleccionado');
    }
    if (ing.cantidad <= 0) {
      throw new Error('La cantidad de cada ingrediente debe ser mayor a 0');
    }
  }

  await new Promise(resolve => setTimeout(resolve, 600));

  // Agregar IDs temporales a los ingredientes para que storage-service los genere correctamente
  const pedidoSemanaBodegaConIngredientes = {
    ...pedidoSemanaBodegaData,
    ingredientes: pedidoSemanaBodegaData.ingredientes.map(ing => ({
      ...ing,
      id: '' // Storage service generará el ID real
    }))
  };

  const nuevaPedidoSemanaBodega = crearPedidoSemanaBodega(pedidoSemanaBodegaConIngredientes);

  return nuevaPedidoSemanaBodega;
};

/**
 * Actualiza una pedidoSemanaBodega existente.
 * @param {IActualizarPedidoSemanaBodega} pedidoSemanaBodegaData - Datos de la pedidoSemanaBodega a actualizar.
 * @returns {Promise<IPedidoSemanaBodega>} Promesa que resuelve a la pedidoSemanaBodega actualizada.
 */
export const actualizarPedidoSemanaBodegaService = async (pedidoSemanaBodegaData: IActualizarPedidoSemanaBodega): Promise<IPedidoSemanaBodega> => {

  // Validaciones
  if (pedidoSemanaBodegaData.ingredientes && pedidoSemanaBodegaData.ingredientes.length === 0) {
    throw new Error('Debe tener al menos un ingrediente');
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const { id, ...cambios } = pedidoSemanaBodegaData;

  const pedidoSemanaBodegaActualizada = actualizarPedidoSemanaBodega(id, cambios);

  if (!pedidoSemanaBodegaActualizada) {
    throw new Error(`PedidoSemanaBodega con ID ${id} no encontrada`);
  }

  return pedidoSemanaBodegaActualizada;
};

/**
 * Crea una pedidoSemanaBodega llamando al backend con el formato detallado.
 * @param {IPedidoSemanaBodegaWithDetailsCreateDTO} data - DTO con los detalles de la pedidoSemanaBodega.
 * @returns {Promise<boolean>} Promesa que resuelve a true si se creó correctamente.
 */
export const crearPedidoSemanaBodegaConDetallesService = async (data: IPedidoSemanaBodegaWithDetailsCreateDTO): Promise<boolean> => {
  try {
    const response = await api.post<boolean>('/pedido-semana-bodega/create-recipe-with-details', data);
    return response.data;
  } catch (error: any) {
    const err = new Error(
      error.response?.data?.message ||
      'Error al crear la pedidoSemanaBodega en el servidor'
    ) as Error & { status?: number };
    err.status = error.response?.status;
    throw err;
  }
};

/**
 * Actualiza una pedidoSemanaBodega con detalles mediante deltas (newItems, updateItems, deleteItems).
 * @param {IPedidoSemanaBodegaWithDetailsUpdateDTO} data - DTO con los cambios de la pedidoSemanaBodega.
 * @returns {Promise<boolean>} Promesa que resuelve a true si se actualizó correctamente.
 */
export const actualizarPedidoSemanaBodegaConDetallesService = async (data: IPedidoSemanaBodegaWithDetailsUpdateDTO): Promise<boolean> => {
  try {
    const response = await api.patch<boolean>('/pedido-semana-bodega/update-recipe-with-details', data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al actualizar la pedidoSemanaBodega en el servidor'
    );
  }
};

/**
 * Elimina una pedidoSemanaBodega.
 * @param {string} id - ID de la pedidoSemanaBodega a eliminar.
 * @returns {Promise<boolean>} Promesa que resuelve a true si la eliminación fue exitosa.
 */
export const eliminarPedidoSemanaBodegaService = async (id: string): Promise<boolean> => {

  await new Promise(resolve => setTimeout(resolve, 400));

  const eliminado = eliminarPedidoSemanaBodega(id);

  if (!eliminado) {
    throw new Error(`PedidoSemanaBodega con ID ${id} no encontrada`);
  }

  return true;
};

/**
 * Cambia el estado de una pedidoSemanaBodega (Activo/Inactivo) mediante el backend.
 * @param {string} id - ID de la pedidoSemanaBodega.
 * @returns {Promise<boolean>} Promesa que resuelve a true si el cambio fue exitoso.
 */
export const cambiarEstadoPedidoSemanaBodegaService = async (id: string): Promise<boolean> => {
  try {
    const idNumero = parseInt(id, 10);
    const response = await api.patch<boolean>(`/pedido-semana-bodega/change-status/${idNumero}`);
    return response.data;
  } catch (error: any) {
    console.error('Error al cambiar el estado de la pedidoSemanaBodega', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al cambiar el estado de la pedidoSemanaBodega'
    );
  }
};

/**
 * Elimina (soft delete) una pedidoSemanaBodega por su ID.
 * @param {number} idPedidoSemanaBodega - ID numérico de la pedidoSemanaBodega.
 * @returns {Promise<boolean>} Promesa que resuelve a true si la eliminación fue exitosa (204).
 */
export const softDeletePedidoSemanaBodegaService = async (idPedidoSemanaBodega: number): Promise<boolean> => {
  try {
    await api.delete(`/pedido-semana-bodega/soft-delete-pedido-semana-bodega/${idPedidoSemanaBodega}`);
    return true;
  } catch (error: any) {
    console.error('Error al eliminar la pedidoSemanaBodega', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al eliminar la pedidoSemanaBodega'
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
 * Obtiene el conteo total de pedidoSemanaBodegas (activas, inactivas y total).
 * @returns {Promise<IPedidoSemanaBodegaCountResponse>}
 */
export const obtenerPedidoSemanaBodegasCountService = async (): Promise<IPedidoSemanaBodegaCountResponse> => {
  try {
    const response = await api.get<IPedidoSemanaBodegaCountResponse>('/pedido-semana-bodega/count-recipes');
    return response.data;
  } catch (error: any) {
    console.error('Error al obtener el conteo de pedidoSemanaBodegas', error);
    throw new Error(
      error.response?.data?.message ||
      'Error al obtener el conteo de pedidoSemanaBodegas'
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

