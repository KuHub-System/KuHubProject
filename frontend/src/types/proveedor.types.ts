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
  rutProveedor: string | null;
  nombreDistribuidora: string;
  nombreProveedor: string;
  telefonoProveedor: string;
  emailProveedor: string | null;
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
  idProveedorProducto: number;
  nombreProducto: string;
  nombreCategoria: string;
  nombreUnidad: string;
  abreviatura: string;
  precioProducto: number;
  activo: boolean;
  fechaActualizacion: string | null;
}

/**
 * Mapea ProveedorDetalleDTO del backend.
 * Incluye los productos agrupados por categoría.
 */
export interface IProveedorDetalle extends IProveedor {
  /** Productos agrupados por nombre de categoría */
  productosPorCategoria: Record<string, IProveedorProducto[]>;
}

/**
 * DTO para crear un nuevo proveedor.
 * Mapea ProveedorCreateDTO del backend.
 */
export interface IProveedorCreateDTO {
  rutProveedor?: string;
  nombreDistribuidora: string;
  nombreProveedor: string;
  telefonoProveedor: string;
  emailProveedor?: string;
  estadoProveedor?: EstadoProveedor;
  diasEntrega?: IDiaEntregaDTO[];
}

/**
 * DTO para actualizar un proveedor existente.
 * Mapea ProveedorUpdateDTO del backend.
 */
export interface IProveedorUpdateDTO {
  rutProveedor?: string;
  nombreDistribuidora: string;
  nombreProveedor: string;
  telefonoProveedor: string;
  emailProveedor?: string;
  estadoProveedor?: EstadoProveedor;
  diasEntrega?: IDiaEntregaDTO[];
}

/**
 * DTO para asignar un producto a un proveedor.
 * Mapea ProveedorProductoAddDTO del backend.
 */
export interface IProveedorProductoAddDTO {
  idProducto: number;
  precioProducto: number;
}

/**
 * DTO para actualizar el precio de un producto en un proveedor.
 * Mapea ProveedorProductoUpdateDTO del backend.
 */
export interface IProveedorProductoUpdateDTO {
  precioProducto: number;
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
