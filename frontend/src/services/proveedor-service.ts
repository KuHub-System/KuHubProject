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
  IProductoDisponibleDTO,
  IBusquedaProductosGlobal,
  IProveedorSelector,
  ISyncExcelResult,
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
  diasEntrega: d.diasEntrega ?? [],
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
 * Lista proveedores activos con paginación asimétrica (20/10).
 * GET /api/v1/proveedor/find-paginated?estado=DISPONIBLE&busqueda=texto&page=1
 */
export const obtenerProveedoresPaginadoService = async (
  estado?: string,
  busqueda?: string,
  page: number = 1
): Promise<{
  data: IProveedor[];
  page: number;
  pageSize: number;
  totalPaginas: number;
  totalRegistros: number;
}> => {
  try {
    const params: Record<string, any> = { page };
    if (estado) params.estado = estado;
    if (busqueda) params.busqueda = busqueda;

    const response = await api.get<any>('/proveedor/find-paginated', { params });
    return {
      data: response.data.data.map(normalizarProveedor),
      page: response.data.page,
      pageSize: response.data.pageSize,
      totalPaginas: response.data.totalPaginas,
      totalRegistros: response.data.totalRegistros,
    };
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
 * [CAMBIO 2026-04-24] Ahora retorna boolean para indicar éxito.
 */
export const agregarProductoProveedorService = async (
  idProveedor: number,
  dto: IProveedorProductoAddDTO
): Promise<boolean> => {
  try {
    const response = await api.post<boolean>(`/proveedor/${idProveedor}/productos`, dto);
    return response.data;
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
 * PATCH /api/v1/proveedor/productos/{idProveedorProducto}
 *
 * Respuestas esperadas:
 *   - 200 OK: Actualizado correctamente
 *   - 400 BAD_REQUEST: Formato inválido o precio ≤ 0
 *   - 404 NOT_FOUND: Relación no existe
 *   - 409 CONFLICT: El precio ingresado es igual al actual (advierte sin error destructivo)
 *
 * [CAMBIO 2026-04-24] Usa idProveedorProducto (PK) + retorna boolean optimizado.
 */
export const actualizarPrecioProductoService = async (
  idProveedorProducto: number,
  dto: IProveedorProductoUpdateDTO
): Promise<boolean> => {
  try {
    const response = await api.patch<boolean>(`/proveedor/productos/${idProveedorProducto}`, dto);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      // 409 CONFLICT: El precio es igual al actual
      throw new Error(
        error.response.data?.message ||
        'El precio ingresado es igual al valor actual. No hay cambios que guardar.'
      );
    }
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
 * DELETE /api/v1/proveedor/{id}/productos/{pid} → 200 OK
 * [CAMBIO 2026-04-24] Retorna boolean para actualizar UI sin segunda petición.
 */
export const quitarProductoProveedorService = async (
  idProveedor: number,
  idProducto: number
): Promise<boolean> => {
  try {
    const response = await api.delete<boolean>(`/proveedor/${idProveedor}/productos/${idProducto}`);
    return response.data;
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
 * Habilita/deshabilita un producto del proveedor (toggle).
 * PATCH /api/v1/proveedor/{id}/productos/{pid}/toggle → 200 OK
 * [CAMBIO 2026-04-24] Retorna boolean para validar cambio exitoso.
 */
export const toggleProductoProveedorService = async (
  idProveedor: number,
  idProducto: number
): Promise<boolean> => {
  try {
    const response = await api.patch<boolean>(`/proveedor/${idProveedor}/productos/${idProducto}/toggle`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(
        error.response.data?.message ||
        'Relación proveedor-producto no encontrada'
      );
    }
    throw new Error(
      error.response?.data?.message ||
      'Error al cambiar el estado del producto'
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

/**
 * Lista productos disponibles para asignar a un proveedor.
 * Retorna todos los productos activos EXCEPTO los que están asignados con estado activo.
 * Incluye productos con estado inactivo para poder reactivarlos.
 * GET /api/v1/proveedor/{idProveedor}/productos-disponibles?idCategoria=X
 *
 * [CAMBIO 2026-04-24] Nuevo endpoint que reemplaza la lógica anterior de obtener todos
 * los productos y filtrar en el frontend. Ahora el backend maneja la consulta optimizada.
 */
export const obtenerProductosDisponiblesService = async (
  idProveedor: number,
  idCategoria?: number
): Promise<IProductoDisponibleDTO[]> => {
  try {
    const params: Record<string, any> = {};
    if (idCategoria !== undefined) {
      params.idCategoria = idCategoria;
    }

    const response = await api.get<string>(`/proveedor/${idProveedor}/productos-disponibles`, { params });

    // El backend retorna una cadena JSON, necesita ser parseada
    if (!response.data || response.data === '[]' || response.data === 'null') {
      return [];
    }

    const parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    return (Array.isArray(parsed) ? parsed : []).map(p => ({
      idProducto: p.id_producto,
      nombreProducto: p.nombre_producto,
      idCategoria: p.id_categoria,
      nombreCategoria: p.nombre_categoria,
      idUnidad: p.id_unidad,
      nombreUnidad: p.nombre_unidad,
      abreviatura: p.abreviatura,
      esFraccionario: p.es_fraccionario,
    }));
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al cargar los productos disponibles'
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

// ── Búsqueda global de productos ──────────────────────────────────────────────

/**
 * Búsqueda global optimizada de productos por nombre, código o descripción.
 * GET /api/v1/proveedor/buscar-productos-global?q=searchTerm
 *
 * Retorna lista de proveedores que tienen productos coincidentes.
 * La búsqueda es case-insensitive en el backend.
 */
export const buscarProductosGlobalService = async (
  searchTerm: string
): Promise<IBusquedaProductosGlobal[]> => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const response = await api.get<IBusquedaProductosGlobal[]>('/proveedor/buscar-productos-global', {
      params: { q: searchTerm.trim() },
    });

    return response.data || [];
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al buscar productos'
    );
  }
};

/**
 * Obtiene todas las categorías activas para filtrar productos en el modal de asignación.
 * GET /api/v1/proveedor/categorias-activas-json → JSON string
 * [CAMBIO 2026-04-24] Endpoint integrado en proveedor para centralizar la lógica de filtrado.
 */
export const obtenerCategoriasActivasJsonService = async (): Promise<{
  id: number;
  nombre: string;
}[]> => {
  try {
    const response = await api.get<string>('/proveedor/categorias-activas-json');

    if (!response.data || response.data === '[]' || response.data === 'null') {
      return [];
    }

    const parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al cargar las categorías disponibles'
    );
  }
};

// ── Sincronización de precios desde Excel ─────────────────────────────────────

/**
 * Lista distribuidoras activas y disponibles para el selector del modal.
 * GET /api/v1/proveedor/selector
 */
export const listarProveedoresSelectorService = async (): Promise<IProveedorSelector[]> => {
  try {
    const response = await api.get<IProveedorSelector[]>('/proveedor/selector');
    return response.data ?? [];
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al cargar las distribuidoras disponibles'
    );
  }
};

/**
 * Sube un archivo .xlsx y sincroniza los precios de los productos del proveedor.
 * POST /api/v1/proveedor/{id}/sync-precios-excel (multipart/form-data)
 */
export const sincronizarPreciosExcelService = async (
  idProveedor: number,
  file: File
): Promise<ISyncExcelResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ISyncExcelResult>(
      `/proveedor/${idProveedor}/sync-precios-excel`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      'Error al sincronizar los precios desde Excel'
    );
  }
};
