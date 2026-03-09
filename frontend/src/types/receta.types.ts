/**
 * TIPOS PARA RECETAS Y SOLICITUDES
 * 
 * Ubicación: src/types/receta.types.ts
 */

/**
 * Interfaz para un ingrediente de receta.
 */
export interface IIngrediente {
  id: string;
  productoId: string; // Referencia al ID del producto en inventario
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
}

/**
 * Interfaz que define la estructura de una receta.
 */
export interface IReceta {
  id: string;
  nombre: string;
  descripcion: string;
  ingredientes: IIngrediente[];
  instrucciones: string;
  estado: 'Activo' | 'Inactivo';
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Interfaz para crear una receta.
 */
export interface ICrearReceta {
  nombre: string;
  descripcion: string;
  ingredientes: Omit<IIngrediente, 'id'>[];
  instrucciones: string;
  estado: 'Activo' | 'Inactivo';
}

/**
 * Interfaz para actualizar una receta.
 */
export interface IActualizarReceta {
  id: string;
  nombre?: string;
  descripcion?: string;
  ingredientes?: IIngrediente[];
  instrucciones?: string;
  estado?: 'Activo' | 'Inactivo';
}

/**
 * Interfaz para un item de solicitud (puede venir de receta o ser adicional).
 */
export interface IItemSolicitud {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
  esAdicional: boolean; // true si fue agregado manualmente, false si viene de la receta
}

/**
 * Interfaz que define la estructura de una solicitud.
 */
export interface ISolicitud {
  id: string;
  asignaturaId: string;
  asignaturaNombre: string;
  fecha: string; // Fecha de la clase
  recetaId?: string | null; // null si es una solicitud custom sin receta base
  recetaNombre?: string | null;
  items: IItemSolicitud[];
  observaciones: string;
  esCustom: boolean; // true si tiene modificaciones a la receta base
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Completada';
  usuarioId: string; // ID del usuario que creó la solicitud
  usuarioNombre: string; // Nombre del usuario que creó la solicitud
  solicitante: string; // Nombre del usuario (alias para compatibilidad)
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Interfaz para crear una solicitud.
 */
export interface ICrearSolicitud {
  asignaturaId: string;
  asignaturaNombre: string;
  fecha: string;
  recetaId?: string | null;
  recetaNombre?: string | null;
  items: Omit<IItemSolicitud, 'id'>[];
  observaciones: string;
  esCustom: boolean;
}

/**
 * Interfaz para actualizar una solicitud.
 */
export interface IActualizarSolicitud {
  id: string;
  estado?: 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Completada';
  observaciones?: string;
}

/**
 * DTO para crear un item de receta (Backend)
 */
export interface IRecipeItemCreateDTO {
  idProducto: number;
  cantUnidadMedida: number;
}

/**
 * DTO para crear una receta con detalles (Backend)
 */
export interface IRecipeWithDetailsCreateDTO {
  nombreReceta: string;
  descripcionReceta: string;
  listaItems: IRecipeItemCreateDTO[];
  instrucciones: string;
  estadoReceta: 'Activo' | 'Inactivo';
}

/**
 * DTO para actualizar una receta con detalles (Backend)
 * PUT /v1/receta/update-recipe-with-details
 */
export interface IRecipeWithDetailsUpdateDTO {
  idReceta: number;
  nombreReceta: string;
  descripcionReceta?: string;
  instruccionesReceta?: string;
  estadoReceta: string;
  newItems: IRecipeItemCreateDTO[];
  updateItems: IRecipeItemCreateDTO[];
  deleteItems: number[];
}

/**
 * DTO para el detalle de una receta en Paginación (Backend)
 */
export interface IDetalleRecetaDTO {
  idDetalleReceta: number;
  nombreProducto: string;
  cantProducto: number;
  abreviatura: string;
  idProducto: number;
  idUnidad: number;
}

/**
 * DTO para una receta en Paginación (Backend)
 */
export interface IRecetaPaginedDTO {
  idReceta: number;
  nombreReceta: string;
  descripcionReceta: string;
  instruccionesReceta?: string;
  estadoReceta: 'Activo' | 'Inactivo';
  totalIngredientes: number;
  detalles: IDetalleRecetaDTO[];
}

/**
 * Meta información de paginación
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
}

/**
 * Respuesta Paginada de Recetas
 */
export interface IPaginatedRecetasResponse {
  content: IRecetaPaginedDTO[];
  paging: IPaginationMeta;
}

/**
 * Respuesta del conteo de recetas
 */
export interface IRecetaCountResponse {
  totalReceta: number;
  total_inactivos: number;
  total_activos: number;
}