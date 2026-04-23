/**
 * SERVICIO DE GESTIÓN DE PROVEEDORES
 * Conecta con el backend en /api/v1/proveedor
 * Patrón: igual que inventario-service.ts (api de config/Axios con interceptor JWT)
 */

import api from '../config/Axios';
import {
  IProveedor,
  IProveedorDetalle,
  IProveedorCreateDTO,
  IProveedorUpdateDTO,
  IProveedorProductoAddDTO,
  IProveedorProductoUpdateDTO,
  ICotizacionResponse,
} from '../types/proveedor.types';

// ── Helpers de transformación ─────────────────────────────────────────────────

/**
 * Normaliza la respuesta del backend para garantizar que cantidadProductosActivos
 * siempre sea un número (el backend puede devolver null si no hay productos).
 */
const normalizarProveedor = (p: any): IProveedor => ({
  idProveedor: p.idProveedor,
  rutProveedor: p.rutProveedor ?? null,
  nombreDistribuidora: p.nombreDistribuidora,
  nombreProveedor: p.nombreProveedor,
  telefonoProveedor: p.telefonoProveedor,
  emailProveedor: p.emailProveedor ?? null,
  estadoProveedor: p.estadoProveedor ?? 'DISPONIBLE',
  activo: p.activo ?? true,
  fechaCreacion: p.fechaCreacion ?? null,
  cantidadProductosActivos: p.cantidadProductosActivos ?? 0,
});

const normalizarDetalle = (d: any): IProveedorDetalle => ({
  ...normalizarProveedor(d),
  productosPorCategoria: d.productosPorCategoria ?? {},
});

// ── Proveedor CRUD ────────────────────────────────────────────────────────────

/**
 * Lista todos los proveedores activos con filtros opcionales.
 * GET /api/v1/proveedor?estado=DISPONIBLE&busqueda=texto
 */
export const obtenerProveedoresService = async (
  estado?: string,
  busqueda?: string
): Promise<IProveedor[]> => {
  try {
    const params: Record<string, string> = {};
    if (estado) params.estado = estado;
    if (busqueda) params.busqueda = busqueda;

    const response = await api.get<any[]>('/proveedor', { params });
    return response.data.map(normalizarProveedor);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al cargar los proveedores'
    );
  }
};

/**
 * Obtiene el detalle completo de un proveedor con sus productos agrupados por categoría.
 * GET /api/v1/proveedor/{id}
 */
export const obtenerProveedorDetalleService = async (
  idProveedor: number
): Promise<IProveedorDetalle> => {
  try {
    const response = await api.get<any>(`/proveedor/${idProveedor}`);
    return normalizarDetalle(response.data);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      `Error al cargar el detalle del proveedor ID=${idProveedor}`
    );
  }
};

/**
 * Crea un nuevo proveedor.
 * POST /api/v1/proveedor → 201 Created
 */
export const crearProveedorService = async (
  dto: IProveedorCreateDTO
): Promise<IProveedor> => {
  try {
    const response = await api.post<any>('/proveedor', dto);
    return normalizarProveedor(response.data);
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error(
        error.response.data?.message ||
        'Ya existe un proveedor con ese RUT'
      );
    }
    if (error.response?.status === 400) {
      throw new Error(
        error.response.data?.message ||
        'Datos inválidos para crear el proveedor'
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al crear el proveedor'
    );
  }
};

/**
 * Actualiza los datos de un proveedor existente.
 * PATCH /api/v1/proveedor/{id} → 200 OK
 */
export const actualizarProveedorService = async (
  idProveedor: number,
  dto: IProveedorUpdateDTO
): Promise<IProveedor> => {
  try {
    const response = await api.patch<any>(`/proveedor/${idProveedor}`, dto);
    return normalizarProveedor(response.data);
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error(
        error.response.data?.message ||
        'Ya existe otro proveedor con ese RUT'
      );
    }
    if (error.response?.status === 404) {
      throw new Error(
        error.response.data?.message ||
        `Proveedor ID=${idProveedor} no encontrado`
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al actualizar el proveedor'
    );
  }
};

/**
 * Elimina lógicamente un proveedor (activo = false).
 * DELETE /api/v1/proveedor/{id} → 204 No Content
 */
export const eliminarProveedorService = async (
  idProveedor: number
): Promise<boolean> => {
  try {
    await api.delete(`/proveedor/${idProveedor}`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 422) {
      throw new Error(
        error.response.data?.message ||
        'No se puede eliminar el proveedor porque tiene productos activos asignados'
      );
    }
    if (error.response?.status === 404) {
      throw new Error(
        error.response.data?.message ||
        `Proveedor ID=${idProveedor} no encontrado`
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al eliminar el proveedor'
    );
  }
};

// ── Relación Proveedor ↔ Producto ─────────────────────────────────────────────

/**
 * Asigna un producto a un proveedor con su precio específico.
 * POST /api/v1/proveedor/{id}/productos → 201 Created
 */
export const agregarProductoProveedorService = async (
  idProveedor: number,
  dto: IProveedorProductoAddDTO
): Promise<void> => {
  try {
    await api.post(`/proveedor/${idProveedor}/productos`, dto);
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error(
        error.response.data?.message ||
        'El producto ya está asignado a este proveedor'
      );
    }
    if (error.response?.status === 404) {
      throw new Error(
        error.response.data?.message ||
        'Proveedor o producto no encontrado'
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al asignar el producto al proveedor'
    );
  }
};

/**
 * Actualiza el precio de un producto asignado a un proveedor.
 * PATCH /api/v1/proveedor/{id}/productos/{pid} → 200 OK
 */
export const actualizarPrecioProductoService = async (
  idProveedor: number,
  idProducto: number,
  dto: IProveedorProductoUpdateDTO
): Promise<void> => {
  try {
    await api.patch(`/proveedor/${idProveedor}/productos/${idProducto}`, dto);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(
        error.response.data?.message ||
        'Relación proveedor-producto no encontrada'
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al actualizar el precio del producto'
    );
  }
};

/**
 * Quita (soft-delete) un producto del proveedor.
 * DELETE /api/v1/proveedor/{id}/productos/{pid} → 204 No Content
 */
export const quitarProductoProveedorService = async (
  idProveedor: number,
  idProducto: number
): Promise<void> => {
  try {
    await api.delete(`/proveedor/${idProveedor}/productos/${idProducto}`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(
        error.response.data?.message ||
        'Relación proveedor-producto no encontrada'
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al quitar el producto del proveedor'
    );
  }
};

/**
 * Lista los proveedores que ofrecen un producto específico (para comparar precios).
 * GET /api/v1/proveedor/por-producto/{idProducto}
 */
export const obtenerProveedoresPorProductoService = async (
  idProducto: number
): Promise<IProveedor[]> => {
  try {
    const response = await api.get<any[]>(`/proveedor/por-producto/${idProducto}`);
    return response.data.map(normalizarProveedor);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al cargar los proveedores del producto'
    );
  }
};

// ── Cotización por rango de fechas ────────────────────────────────────────────

/**
 * Obtiene la cotización agrupada por proveedor para un rango de fechas.
 * POST /api/v1/proveedor/cotizacion-rango
 */
export const obtenerCotizacionPorRangoService = async (
  fechaInicio: string,
  fechaFin: string
): Promise<ICotizacionResponse> => {
  try {
    const response = await api.post<ICotizacionResponse>('/proveedor/cotizacion-rango', {
      fechaInicio,
      fechaFin,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(
        error.response.data?.message ||
        'Rango de fechas inválido'
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al obtener la cotización por rango'
    );
  }
};
