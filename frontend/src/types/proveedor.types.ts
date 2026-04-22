/**
 * TIPOS DE DATOS — MÓDULO GESTIÓN DE PROVEEDORES
 * Mapea los DTOs del backend (ProveedorListDTO, ProveedorDetalleDTO, ProductoConPrecioDTO)
 */

export type EstadoProveedor = 'DISPONIBLE' | 'NO_DISPONIBLE';

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
