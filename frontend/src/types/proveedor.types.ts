/**
 * TIPOS DE DATOS — MÓDULO GESTIÓN DE PROVEEDORES
 * Mapea los DTOs del backend (ProveedorListDTO, ProveedorDetalleDTO, ProductoConPrecioDTO)
 */

export type EstadoProveedor = 'DISPONIBLE' | 'NO_DISPONIBLE';
export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

/**
 * DTO para un día de entrega del proveedor.
 * Mapea DiaEntregaDTO del backend.
 */
export interface IDiaEntregaDTO {
  diaSemana: DiaSemana;
  horaInicio?: string; // Formato HH:mm o HH:mm:ss
  horaFin?: string;    // Formato HH:mm o HH:mm:ss
}

/**
 * Mapea ProveedorListDTO del backend.
 * Usado en la tabla principal de proveedores.
 */
export interface IProveedor {
  idProveedor: number;
  rutProveedor: string;
  nombreDistribuidora: string;
  nombreProveedor: string;
  telefonoProveedor: string;
  emailProveedor: string;
  /** Dirección opcional. Solo viene poblada en el detalle, no en la lista. */
  direccionProveedor?: string | null;
  estadoProveedor: EstadoProveedor;
  activo: boolean;
  fechaCreacion: string | null;
  cantidadProductosActivos: number;
}

/**
 * Mapea ProductoConPrecioDTO del backend.
 * Representa un producto asignado a un proveedor con su precio específico.
 */
export interface IProveedorProducto {
  idProducto: number;
  idProveedorProducto: number;  // PK de la relación proveedor-producto (se usa para actualizar precio)
  nombreProducto: string;
  nombreCategoria: string;
  nombreUnidad: string;
  abreviatura: string;
  activo: boolean;
  fechaActualizacion: string | null;
  marcaProducto?: string | null;
  formatoContenido?: string | null;
  precioNeto: number;
  precioConIva: number;
}

/**
 * DTO para mostrar un día de entrega del proveedor.
 * Mapea DiaEntregaResponseDTO del backend.
 */
export interface IDiaEntregaResponse {
  idDiaEntrega: number;
  diaSemana: DiaSemana;
  horaInicioEntrega?: string; // Formato HH:mm:ss
  horaFinEntrega?: string;    // Formato HH:mm:ss
}

/**
 * Mapea ProveedorDetalleDTO del backend.
 * Incluye los productos agrupados por categoría y los días de entrega.
 */
export interface IProveedorDetalle extends IProveedor {
  /** Productos agrupados por nombre de categoría */
  productosPorCategoria: Record<string, IProveedorProducto[]>;
  /** Días y horarios de entrega configurados */
  diasEntrega: IDiaEntregaResponse[];
}

/**
 * DTO para crear un nuevo proveedor.
 * Mapea ProveedorCreateDTO del backend.
 */
export interface IProveedorCreateDTO {
  rutProveedor: string;
  nombreDistribuidora: string;
  nombreProveedor: string;
  telefonoProveedor: string;
  emailProveedor: string;
  /** Dirección opcional — usada en la cabecera del Excel plantilla. */
  direccionProveedor?: string;
  estadoProveedor?: EstadoProveedor;
  diasEntrega?: IDiaEntregaDTO[];
}

/**
 * DTO para actualizar un proveedor existente.
 * Mapea ProveedorUpdateDTO del backend.
 */
export interface IProveedorUpdateDTO {
  rutProveedor: string;
  nombreDistribuidora: string;
  nombreProveedor: string;
  telefonoProveedor: string;
  emailProveedor: string;
  /** Dirección opcional — usada en la cabecera del Excel plantilla. */
  direccionProveedor?: string;
  estadoProveedor?: EstadoProveedor;
  diasEntrega?: IDiaEntregaDTO[];
}

/**
 * DTO para asignar un producto a un proveedor.
 * Mapea ProveedorProductoAddDTO del backend.
 * Al menos uno de precioNeto o precioConIva es obligatorio; el backend deriva el otro.
 * Los precios en formato chileno: 1.234,567 | 1.234 | 1234,567 | 1234.567 | 1234
 */
export interface IProveedorProductoAddDTO {
  idProducto: number;
  marcaProducto?: string;
  formatoContenido?: string;
  precioNeto?: string;
  precioConIva?: string;
}

/**
 * DTO para actualizar precio y metadata de un producto en un proveedor.
 * Mapea ProveedorProductoUpdateDTO del backend.
 * Al menos uno de precioNeto o precioConIva es obligatorio; el backend deriva el otro.
 */
export interface IProveedorProductoUpdateDTO {
  marcaProducto?: string;
  formatoContenido?: string;
  precioNeto?: string;
  precioConIva?: string;
}

/**
 * DTO para un producto disponible que puede ser asignado a un proveedor.
 * Mapea ProductoDisponibleDTO del backend.
 * Incluye información del producto, categoría y unidad de medida.
 */
export interface IProductoDisponibleDTO {
  idProducto: number;
  nombreProducto: string;
  idCategoria: number;
  nombreCategoria: string;
  idUnidad: number;
  nombreUnidad: string;
  abreviatura: string;
  esFraccionario: boolean;
}

// ── Cotización por rango de fechas ────────────────────────────────────────────

/**
 * Producto dentro de una categoría en la cotización.
 * Mapea CotizacionProveedorDTO.ProductoJson del backend.
 */
export interface ICotizacionProducto {
  idProducto: number;
  nombreProducto: string;
  abreviatura: string;
  cantidadTotal: number;
  precioUnitario: number | null;
  subtotal: number | null;
}

/**
 * Categoría agrupada dentro de un proveedor en la cotización.
 * Mapea CotizacionProveedorDTO.CategoriaGrupo del backend.
 */
export interface ICotizacionCategoria {
  idCategoria: number;
  nombreCategoria: string;
  productos: ICotizacionProducto[];
}

/**
 * Proveedor agrupado con sus categorías y productos.
 * Mapea CotizacionProveedorDTO.ProveedorGrupo del backend.
 * Cuando idProveedor es null, son productos sin proveedor asignado.
 */
export interface ICotizacionProveedor {
  idProveedor: number | null;
  nombreDistribuidora: string | null;
  nombreProveedor: string | null;
  telefono: string | null;
  email: string | null;
  totalProductos: number;
  categorias: ICotizacionCategoria[];
}

/**
 * Respuesta completa de la cotización por rango.
 * Mapea CotizacionProveedorDTO.CotizacionResponse del backend.
 */
export interface ICotizacionResponse {
  cotizacion: ICotizacionProveedor[];
}

// ── Búsqueda global de productos ───────────────────────────────────────────

/**
 * Producto encontrado en la búsqueda global.
 * Mapea ProductoBuscadoDTO del backend.
 */
export interface IProductoBuscado {
  idProducto: number;
  idProveedorProducto: number;
  codProducto: string;
  nombreProducto: string;
  nombreUnidad: string;
  abreviatura: string;
  marcaProducto: string | null;
  formatoContenido: string | null;
  precioNeto: number;
  precioConIva: number;
  activo: boolean;
  fechaActualizacion: string | null;
}

/**
 * Productos agrupados por categoría.
 * Mapea CategoryProductsDTO del backend.
 */
export interface ICategoryProducts {
  nombreCategoria: string;
  productos: IProductoBuscado[];
}

/**
 * Resultado de búsqueda global agrupado por proveedor y categoría.
 * Mapea BusquedaProductosGlobalDTO del backend.
 */
export interface IBusquedaProductosGlobal {
  idProveedor: number;
  rutProveedor: string;
  nombreDistribuidora: string;
  nombreProveedor: string;
  emailProveedor: string;
  telefonoProveedor: string;
  estadoProveedor: EstadoProveedor;
  cantidadProductosActivos: number;
  categorias: ICategoryProducts[];
}

// ── Sincronización de precios desde Excel ─────────────────────────────────

/**
 * Item del selector de distribuidoras para el modal de sincronización.
 * Mapea ProveedorSelectorView (proyección interfaz) del backend.
 */
export interface IProveedorSelector {
  idProveedor: number;
  nombreDistribuidora: string;
}

/**
 * Producto sincronizado correctamente desde el Excel (precio cambió → nueva versión).
 * Mapea SyncExcelResultDTO.ProductoSincronizado del backend.
 */
export interface ISyncProductoSincronizado {
  fila: number;
  nombreProducto: string;
  precioNeto: number;
  precioConIva: number;
}

/**
 * Producto cuyo precio coincide con la versión activa actual; no se versiona.
 * Mapea SyncExcelResultDTO.ProductoSinCambios del backend.
 */
export interface ISyncProductoSinCambios {
  fila: number;
  nombreProducto: string;
  precioNeto: number;
  precioConIva: number;
}

/**
 * Fila con datos válidos pero cuyo nombre no existe en el sistema.
 * Mapea SyncExcelResultDTO.ProductoNoEncontrado del backend.
 */
export interface ISyncProductoNoEncontrado {
  fila: number;
  nombreExcel: string;
}

/**
 * Resultado de la sincronización de precios desde Excel.
 * Mapea SyncExcelResultDTO del backend.
 */
export interface ISyncExcelResult {
  totalSincronizados: number;
  totalSinCambios: number;
  totalNoEncontrados: number;
  sincronizados: ISyncProductoSincronizado[];
  sinCambios: ISyncProductoSinCambios[];
  noEncontrados: ISyncProductoNoEncontrado[];
}

// ── Orden de pedido — Paso 1 (pedidos APROBADO con indicador de OP) ──────────

export type TDiaSemana =
  | 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES'
  | 'VIERNES' | 'SABADO' | 'DOMINGO';

/** Mapea PedidoSemanaResumenDTO del backend (GET /orden-pedido/pedidos-semana). */
export interface IPedidoSemanaResumen {
  idPedido: number;
  fechaInicioPedido: string;        // YYYY-MM-DD
  fechaFinPedido: string;           // YYYY-MM-DD
  estadoPedido: string;
  cantidadOrdenPedido: number;      // OPs activas con estado != CANCELADA
  cantidadOrdenCanceladas: number;  // OPs activas con estado == CANCELADA
  tieneOrdenPedido: boolean;        // = cantidadOrdenPedido > 0
}

// ── Orden Pedido — Paso 2 (cotización consolidada) ────────────────────────

/** Distribución de la cantidad solicitada de un producto por día de la semana. */
export interface ICantidadDia {
  dia: TDiaSemana | 'SIN_DIA';   // SIN_DIA = solicitud sin id_reserva_sala
  cantidad: number;
}

/**
 * Producto consolidado del proveedor ganador (menor precio_neto vigente).
 * Mapea CotizacionConsolidadaDTO.ProductoJson.
 */
export interface IProductoConsolidado {
  idProducto: number;
  nombreProducto: string;
  abreviatura: string;
  esFraccionario: boolean;
  cantidadTotal: number;
  precioNeto: number | null;
  precioConIva: number | null;
  cantidadPorDia: ICantidadDia[];
}

/** Mapea CotizacionConsolidadaDTO.CategoriaGrupo. */
export interface ICategoriaGrupoConsolidado {
  idCategoria: number;
  nombreCategoria: string;
  productos: IProductoConsolidado[];
}

/**
 * Proveedor + sus días de entrega + categorías + totales.
 * Mapea CotizacionConsolidadaDTO.ProveedorGrupo.
 * idProveedor = null → bucket "Sin proveedor" (productos sin precio vigente).
 */
export interface IProveedorGrupoConsolidado {
  idProveedor: number | null;
  nombreDistribuidora: string | null;
  nombreProveedor: string | null;
  telefono: string | null;
  email: string | null;
  totalProductos: number;
  totalNeto: number;
  totalConIva: number;
  diasEntrega: TDiaSemana[] | null;
  categorias: ICategoriaGrupoConsolidado[];
}

/** Mapea CotizacionConsolidadaDTO.CotizacionConsolidadaResponse. */
export interface ICotizacionConsolidadaResponse {
  cotizacion: IProveedorGrupoConsolidado[];
}

// ── Orden de Pedido — Tarea #27 ───────────────────────────────────────────────

export type EstadoOrdenPedido =
  | 'PENDIENTE'
  | 'ENVIADA'
  | 'CANCELADA'
  | 'CONFIRMADA'
  | 'RECIBIDA';

/** Resumen devuelto por el backend al crear una Orden de Pedido. */
export interface IOrdenPedidoResumen {
  idOrdenPedido: number;
  idPedido: number;
  idProveedor: number;
  fechaCreacion: string;
  estadoOrdenPedido: EstadoOrdenPedido;
  cantidadDetalles: number;
}

/** Ítem del listado de Órdenes de Pedido (sin líneas de detalle). */
export interface IOrdenPedidoListItem {
  idOrdenPedido: number;
  idPedido: number;
  fechaInicioPedido: string; // YYYY-MM-DD
  fechaFinPedido: string;    // YYYY-MM-DD
  idProveedor: number;
  nombreDistribuidora: string;
  nombreProveedor: string;
  fechaCreacion: string;     // ISO datetime
  estadoOrdenPedido: EstadoOrdenPedido;
  observaciones: string | null;
  cantidadDetalles: number;
  totalNeto: number;
  totalConIva: number;
}

/** Línea de detalle de una Orden de Pedido. */
export interface IDetalleOrdenPedido {
  idDetalleOrdenPedido: number;
  idProducto: number;
  nombreProducto: string;
  nombreCategoria: string;
  abreviatura: string;
  nombreUnidad: string;
  esFraccionario: boolean;
  cantidadSolicitada: number;
  precioNetoUnitario: number | null;
  precioConIvaUnitario: number | null;
  fechaEntrega: string; // YYYY-MM-DD
  entregado: boolean;
  formatoContenido: string | null;
  observacion: string | null; // porciones de solicitud: "pc1 2x(5)/ pc2 10"
}

/** Entrega real registrada en movimiento (ENTRADA_INVENTARIO o ENTRADA_BODEGA), ligada a la línea exacta de la OP. */
export interface IEntregaReal {
  idDetalleOrdenPedido: number; // línea/fecha exacta de la OP — clave de mapeo
  cantidadEntregada: number;
  destino: 'INVENTARIO' | 'BODEGA';
}

/** Orden de Pedido completa con cabecera y todas sus líneas de detalle. */
export interface IOrdenPedidoConDetalles extends IOrdenPedidoListItem {
  telefonoProveedor: string | null;
  emailProveedor: string | null;
  direccionProveedor: string | null;
  detalles: IDetalleOrdenPedido[];
  entregasReales: IEntregaReal[];
}

// ── Abastecimiento de Proveedores (OPs CONFIRMADA) ───────────────────────────

/** Producto dentro de una entrega de abastecimiento. */
export interface IProductoEntregaAbastecimiento {
  idDetalleOrdenPedido: number;
  idProducto: number;
  nombreProducto: string;
  abreviatura: string;
  esFraccionario: boolean;
  cantidadSolicitada: number;
  marcaProducto: string;
  entregado: boolean;
  idInventario: number;
  stock: number;
}

/** Agrupa los productos de una misma categoría dentro de una entrega. */
export interface ICategoriaEntregaAbastecimiento {
  nombreCategoria: string;
  productos: IProductoEntregaAbastecimiento[];
}

/** Agrupa las categorías que se entregan en una misma fecha. */
export interface IEntregaDiaAbastecimiento {
  fechaEntrega: string; // YYYY-MM-DD
  categorias: ICategoriaEntregaAbastecimiento[];
}

/** Una OP CONFIRMADA con sus fechas de entrega y productos agrupados. */
export interface IOrdenAbastecimiento {
  idOrdenPedido: number;
  idPedido: number;
  idProveedor: number;
  nombreDistribuidora: string;
  nombreProveedor: string;
  telefonoProveedor: string | null;
  emailProveedor: string | null;
  entregas: IEntregaDiaAbastecimiento[];
}

/** Respuesta completa del endpoint de abastecimiento. */
export interface IAbastecimientoProveedorResponse {
  ordenes: IOrdenAbastecimiento[];
}
