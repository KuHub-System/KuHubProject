/**
 * Interfaz que define la estructura de un producto en el inventario.
 */
export interface IProducto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  unidadMedida: string;
  stock: number;
  stockMinimo: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/**
 * Interfaz que define la estructura de un movimiento de producto.
 */
export interface IMovimientoProducto {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: 'Entrada' | 'Salida' | 'Merma';
  cantidad: number;
  fechaMovimiento: string;
  responsable: string;
  observacion: string;
}

/**
 * Interfaz para los datos de creación de un producto.
 */
export interface ICrearProducto {
  nombre: string;
  descripcion: string;
  categoria: string;
  unidadMedida: string;
  stock: number;
  stockMinimo: number;
}

/**
 * Interfaz para los datos de actualización de un producto.
 */
export interface IActualizarProducto extends Partial<ICrearProducto> {
  id: string;
}

/**
 * Interfaz para los datos de creación de un movimiento.
 */
export interface ICrearMovimiento {
  productoId: string;
  tipo: 'Entrada' | 'Salida' | 'Merma';
  cantidad: number;
  observacion: string;
}
