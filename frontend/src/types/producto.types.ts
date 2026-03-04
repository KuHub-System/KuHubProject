/**
 * Interfaz que define la estructura de un producto en el inventario.
 */
export interface IProducto {
  id: string;
  nombre: string;
  descripcion: string;
  codProducto?: string;
  categoria: string;
  unidadMedida: string;
  stock: number;
  stockMinimo: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  // Propiedades internas (no se usan en UI)
  _idInventario?: number;
  _esFraccionario?: boolean;
}

/**
 * Interfaz que define la estructura de un movimiento de producto.
 */
export interface IMovimientoProducto {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: 'Entrada' | 'Salida' | 'Merma' | 'Ajuste' | 'Devolucion';
  cantidad: number;
  fechaMovimiento: string;
  responsable: string;
  observacion: string;
}

/**
 * Interfaz para la respuesta del endpoint de filtros del inventario
 */
export interface IFiltrosInventarioResponse {
  categorias: Array<{ id: number; nombre: string }>;
  unidades: Array<{ id: number; nombre: string }>;
}

/**
 * Interfaz para los datos de creación de un producto.
 */
export interface ICrearProducto {
  nombre: string;
  descripcion: string;
  codProducto?: string;
  idCategoria: number;
  idUnidadMedida: number;
  stock: number;
  stockMinimo: number;
}

/**
 * Interfaz para los datos de actualización de un producto.
 */
export interface IActualizarProducto {
  id: string; // idProducto
  idInventario: number;
  nombre?: string;
  descripcion?: string;
  codProducto?: string;
  categoria?: string;
  unidadMedida?: string;
  idCategoria: number;
  idUnidadMedida: number;
  stock?: number;
  stockMinimo?: number;
  tipoMovimiento: string;
}

/**
 * Interfaz para los datos de creación de un movimiento.
 */
export interface ICrearMovimiento {
  productoId: string;
  tipo: 'Entrada' | 'Salida' | 'Merma' | 'Ajuste' | 'Devolucion';
  cantidad: number;
  observacion: string;
}

/**
 * Interfaz para la solicitud de inventario paginado.
 */
export interface IInventoryPageRequest {
  categoriasIds: number[];
  unidadesIds: number[];
  soloStockBajo: boolean;
  page: number;
  pageSize?: number;
  ocultarAgotados?: boolean;
  isDesc?: boolean;
  isAsc?: boolean;
}

/**
 * Interfaz para un item individual en la respuesta de inventario paginado.
 * Basado en la nueva estructura anidada del backend.
 */
export interface IInventoryPageItem {
  idInventario: number;
  producto: {
    idProducto: number;
    nombre: string;
    codProducto?: string;
    descripcionProducto?: string;
    categoria: {
      idCategoria: number;
      nombre: string;
    };
    unidad: {
      idUnidad: number;
      nombre: string;
    };
  };
  stockActual: number;
  stockMinimo: number;
  stockBajo: boolean;
  esFraccionario?: boolean;
  // El backend no está devolviendo anidado a veces, sino plano
  codProducto?: string;
  descripcionProducto?: string;
}

/**
 * Interfaz para la respuesta completa de inventario paginado.
 */
export interface IInventoryPageResponse {
  items: IInventoryPageItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

/**
 * DTO para validar el stock antes de actualizar
 */
export interface IValidateStockRequest {
  validateStock: number;
  idInventario: number;
}

/**
 * DTO para la respuesta de conflicto (409) en la validación de stock
 */
export interface IValidateStockConflictResponse {
  idInventario: number;
  idProducto: number;
  nombreProducto: string;
  codProducto?: string | null;
  descripcionProducto?: string | null;
  idCategoria: number;
  nombreCategoria: string;
  idUnidad: number;
  nombreUnidad: string;
  stock: number;
  stockLimit: number;
}