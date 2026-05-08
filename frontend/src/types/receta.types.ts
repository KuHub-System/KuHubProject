/**
 * TIPOS PARA PEDIDOS SEMANALES A BODEGA
 *
 * Ubicación: src/types/receta.types.ts
 */

/**
 * Interfaz para un ingrediente de pedido semanal.
 */
export interface IIngrediente {
  id: string;
  productoId: string; // Referencia al ID del producto en inventario
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
}

/**
 * Interfaz que define la estructura de un pedido semanal a bodega.
 */
export interface IPedidoSemanaBodega {
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
 * Interfaz para crear un pedido semanal a bodega.
 */
export interface ICrearPedidoSemanaBodega {
  nombre: string;
  descripcion: string;
  ingredientes: Omit<IIngrediente, 'id'>[];
  instrucciones: string;
  estado: 'Activo' | 'Inactivo';
}

/**
 * Interfaz para actualizar un pedido semanal a bodega.
 */
export interface IActualizarPedidoSemanaBodega {
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
 * DTO para crear un item de pedido semanal (Backend)
 */
export interface IPedidoSemanaBodegaItemCreateDTO {
  idProducto: number;
  cantUnidadMedida: number;
  observacion?: string;
}

/**
 * DTO para crear un pedido semanal con detalles (Backend)
 */
export interface IPedidoSemanaBodegaWithDetailsCreateDTO {
  nombrePedido: string;
  descripcionPedido: string;
  listaItems: IPedidoSemanaBodegaItemCreateDTO[];
  estadoPedido: 'Activo' | 'Inactivo';
  idSemana?: number;
  idAsignatura?: number | null;
}

/**
 * DTO para actualizar un pedido semanal con detalles (Backend)
 * PUT /v1/pedido-semana-bodega/update-recipe-with-details
 */
export interface IPedidoSemanaBodegaWithDetailsUpdateDTO {
  idPedidoSemanaBodega: number;
  nombrePedido: string;
  descripcionPedido?: string;
  estadoPedido: string;
  newItems: IPedidoSemanaBodegaItemCreateDTO[];
  updateItems: IPedidoSemanaBodegaItemCreateDTO[];
  deleteItems: number[];
  idSemana?: number;
  idAsignatura?: number | null;
}

/**
 * DTO para el detalle de un pedido semanal en Paginación (Backend)
 */
export interface IDetallePedidoSemanaBodegaDTO {
  idDetallePedido: number;
  nombreProducto: string;
  cantProducto: number;
  abreviatura: string;
  idProducto: number;
  idUnidad: number;
  observacion?: string;
}

/**
 * DTO para un pedido semanal en Paginación (Backend)
 */
export interface IPedidoSemanaBodegaPaginedDTO {
  idPedidoSemanaBodega: number;
  nombrePedido: string;
  descripcionPedido: string;
  estadoPedido: 'Activo' | 'Inactivo';
  totalDetalles: number;
  idSemana?: number | null;
  idAsignatura?: number | null;
  detalles: IDetallePedidoSemanaBodegaDTO[];
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
 * Respuesta Paginada de Pedidos Semanales
 */
export interface IPaginatedPedidoSemanaBodegaResponse {
  content: IPedidoSemanaBodegaPaginedDTO[];
  paging: IPaginationMeta;
}

/**
 * Respuesta del conteo de pedidos semanales
 */
export interface IPedidoSemanaBodegaCountResponse {
  totalPedidos: number;
  total_inactivos: number;
  total_activos: number;
}

/** Item individual del resultado de importación Excel */
export interface IResultadoItemExcel {
  fila: number;
  nombreExcel: string;
  idProducto?: number;
  nombreProducto?: string;
  nombreUnidadMedida?: string;
  cantidad?: number;
  observacion?: string;
  estado: 'ok' | 'no_encontrado';
}

/** Respuesta del endpoint POST /pedido-semana-bodega/importar-excel */
export interface IImportarExcelResultado {
  resultados: IResultadoItemExcel[];
  totalOk: number;
  totalNoEncontrados: number;
  numeroSemanaExcel: number;
  preparaciones?: string;
}

/** Asignatura activa para el selector del modal de pedido semanal */
export interface IAsignatura {
  idAsignatura: number;
  codAsignatura: string;
  nombreAsignatura: string;
}