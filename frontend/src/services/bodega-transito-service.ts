import api from '../config/Axios';

export interface IBodegaTransitoItem {
    idBodegaTransito: number;
    idInventario: number;
    idProducto: number;
    nombreProducto: string;
    codProducto: string | null;
    descripcionProducto: string;
    idCategoria: number;
    nombreCategoria: string;
    idUnidad: number;
    nombreUnidad: string;
    esFraccionario?: boolean;
    stock: number;
    stockLimit: number | null;
}

export interface IBodegaTransitoResponse {
    data: IBodegaTransitoItem[];
    page: number;
    pageSize: number;
    totalPaginas: number;
    totalRegistros: number;
}

export interface IBodegaTransitoPagedRequest {
    page: number;
    pageSize: number;
    categoriasIds?: number[];
    unidadesIds?: number[];
    soloStockBajo?: boolean;
    ocultarAgotados?: boolean;
    isDesc?: boolean;
    isAsc?: boolean;
}

/**
 * Servicio para buscar productos en la bodega de tránsito con paginación y filtros.
 * Endpoint: POST /v1/bodega-transito/paged-bodega
 */
export const obtenerBodegaPaginadaService = async (request: IBodegaTransitoPagedRequest): Promise<IBodegaTransitoResponse> => {
    try {
        const response = await api.post<IBodegaTransitoResponse>('/bodega-transito/paged-bodega', request);
        return response.data;
    } catch (error) {
        console.error('Error al obtener bodega de tránsito paginada:', error);
        throw error;
    }
};

/**
 * Servicio para buscar productos en la bodega de tránsito por término (nombre o descripción).
 * Endpoint: POST /v1/bodega-transito/search-bodega
 */
export const buscarBodegaTransitoService = async (term: string, page: number = 1, pageSize: number = 10): Promise<IBodegaTransitoResponse> => {
    try {
        const response = await api.post<IBodegaTransitoResponse>('/bodega-transito/search-bodega', {
            term,
            page,
            pageSize
        });
        return response.data;
    } catch (error) {
        console.error('Error al buscar por término en bodega de tránsito:', error);
        throw error;
    }
};

/**
 * Servicio para buscar productos en la bodega de tránsito por código de producto.
 * Endpoint: POST /v1/bodega-transito/search-by-cod-producto
 */
export const buscarBodegaTransitoPorCodigoService = async (codigo: string, page: number = 1): Promise<IBodegaTransitoResponse> => {
    try {
        const response = await api.post<IBodegaTransitoResponse>('/bodega-transito/search-by-cod-producto', {
            term: codigo,
            page: page
        });
        return response.data;
    } catch (error) {
        console.error('Error al buscar por código en bodega de tránsito:', error);
        throw error;
    }
};

export interface WarehouseWithProductUpdateDTO {
    idBodegaTransito: number;
    idInventario: number;
    idProducto: number;
    tipoMovimiento: string | null;  // null si solo se actualiza metadata / stockLimit
    nombreProducto: string;
    codigoProducto?: string;
    descripcionProducto?: string;
    idCategoria: number;
    idUnidadMedida: number;
    stock: number;
    stockLimit: number;
    delta: number | null;           // null si no hay movimiento de stock
    stockEnVista: number;
}

// ── Control de Stock Masivo ──────────────────────────────────────────────────

export interface IBulkBodegaListing {
    idBodegaTransito: number;
    idProducto: number;
    idInventario: number;
    nombreProducto: string;
    detalles: string;
    stock: number;
    esFraccionario: boolean;
}

export interface IBulkBodegasPage {
    content: IBulkBodegaListing[];
    page: number;
    limit: number;
    totalPages: number;
    totalElements: number;
}

export interface IBulkWarehouseUpdateRequest {
    idBodegaTransito: number;
    delta: number;
    stockEnVista: number;
    tipoMovimiento: string;
    idSolicitud?: number;
    idPedido?: number;
    idOrdenPedido?: number;
    idDetalleOrdenPedido?: number;
}

export interface IBulkWarehouseItemResult {
    idBodegaTransito: number;
    producto: string;
    stockResultante: number;
    mensaje: string;
}

export interface IBulkWarehouseProcessResult {
    exitosos: IBulkWarehouseItemResult[];
    advertencias: IBulkWarehouseItemResult[];
    errores: IBulkWarehouseItemResult[];
}

/**
 * Lista paginada de productos de bodega para el Control de Stock Masivo.
 * Endpoint: POST /v1/bodega-transito/massive-warehouse-listing
 */
export const obtenerBulkBodegaListingService = async (
    term: string,
    page: number
): Promise<IBulkBodegasPage> => {
    const response = await api.post<IBulkBodegasPage>(
        '/bodega-transito/massive-warehouse-listing',
        { term, page }
    );
    return response.data;
};

/**
 * Envía la lista de ítems al backend para procesamiento masivo de bodega de tránsito.
 * Endpoint: PATCH /v1/bodega-transito/bulk-update-warehouse-stock
 */
export const bulkUpdateBodegaStockService = async (
    requests: IBulkWarehouseUpdateRequest[]
): Promise<IBulkWarehouseProcessResult> => {
    const response = await api.patch<IBulkWarehouseProcessResult>(
        '/bodega-transito/bulk-update-warehouse-stock',
        requests
    );
    return response.data;
};

/**
 * Retorna los registros activos de bodega de tránsito para una lista de IDs de inventario.
 * Lookup directo sin paginación: evita el límite de PaginationUtils.
 * Endpoint: POST /v1/bodega-transito/find-by-inventario-ids
 */
export const obtenerBodegaByInventarioIdsService = async (
    inventarioIds: number[]
): Promise<IBodegaTransitoItem[]> => {
    const response = await api.post<IBodegaTransitoItem[]>(
        '/bodega-transito/find-by-inventario-ids',
        inventarioIds
    );
    return response.data;
};

/**
 * Para cada idProducto recibido, crea (si no existe) inventario y bodega_transito con stock=0.
 * Endpoint: POST /v1/bodega-transito/inicializar-desde-abastecimiento
 */
export const inicializarDesdeAbastecimientoService = async (
    idsProducto: number[]
): Promise<IBodegaTransitoItem[]> => {
    try {
        const response = await api.post<IBodegaTransitoItem[]>(
            '/bodega-transito/inicializar-desde-abastecimiento',
            idsProducto
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al inicializar productos en bodega de tránsito');
    }
};

export interface ICreateBodegaConProductoRequest {
    nombreProducto: string;
    codigoProducto?: string;
    descripcionProducto?: string;
    idCategoria: number;
    idUnidadMedida: number;
    stock: number;
    stockLimit?: number;
}

/**
 * Crea un producto nuevo con inventario en cero y registro de bodega de tránsito.
 * Aplica ENTRADA_BODEGA si el stock inicial es mayor a cero.
 * Endpoint: POST /v1/bodega-transito/create-bodega-con-producto
 */
export const crearBodegaConProductoService = async (
    data: ICreateBodegaConProductoRequest
): Promise<IBodegaTransitoItem> => {
    try {
        const response = await api.post<IBodegaTransitoItem>('/bodega-transito/create-bodega-con-producto', data);
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 409) {
            throw new Error(error.response.data?.message || 'El nombre o código del producto ya está en uso');
        }
        throw new Error(error.response?.data?.message || 'Error al crear producto en bodega');
    }
};

import type { ISincronizarInventarioExcelResultado } from '../types/inventario.types';

/**
 * Sincroniza el stock de bodega de tránsito desde un Excel.
 * Endpoint: POST /v1/bodega-transito/sincronizar-excel
 */
export const sincronizarBodegaTransitoDesdeExcelService = async (
    archivo: File,
    filaInicio: number,
    filaFin: number,
    idCategoria: number,
    nombreHoja?: string
): Promise<ISincronizarInventarioExcelResultado> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('filaInicio', String(filaInicio));
    formData.append('filaFin', String(filaFin));
    formData.append('idCategoria', String(idCategoria));
    const params = nombreHoja ? `?nombreHoja=${encodeURIComponent(nombreHoja)}` : '';
    try {
        const response = await api.post<ISincronizarInventarioExcelResultado>(
            `/bodega-transito/sincronizar-excel${params}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || 'Error al procesar el Excel de bodega de tránsito'
        );
    }
};

/**
 * Confirma la creación de productos no encontrados en la sincronización Excel de bodega.
 * Endpoint: POST /v1/bodega-transito/sincronizar-excel/confirmar-nuevos
 */
export const confirmarNuevosBodegaExcelService = async (
    items: Array<{ nombre: string; idUnidadMedida: number; stock: number; idCategoria: number }>
): Promise<number> => {
    const response = await api.post<number>(
        '/bodega-transito/sincronizar-excel/confirmar-nuevos',
        items
    );
    return response.data;
};

export interface IBodegaStockSyncWarning {
    desync: true;
    warning: string;
    item: IBodegaTransitoItem;
}

export interface IBodegaStockInsuficiente {
    insuficiente: true;
    warning: string;
    item: IBodegaTransitoItem;
}

/**
 * Servicio para actualizar un producto en la bodega de tránsito.
 * Endpoint: PATCH /v1/bodega-transito/update-warehouse-with-product
 * Respuestas:
 *   200 OK              → IBodegaTransitoItem (éxito limpio)
 *   409 Conflict        → { warning, item } (desincronizado pero guardado)
 *   422 Unprocessable   → { warning, item } (stock insuficiente, no guardado)
 */
export const actualizarBodegaTransitoConProductoService = async (
    data: WarehouseWithProductUpdateDTO
): Promise<IBodegaTransitoItem | IBodegaStockSyncWarning | IBodegaStockInsuficiente> => {
    try {
        const response = await api.patch<any>('/bodega-transito/update-warehouse-with-product', data);
        const body = response.data;

        // El backend retorna 200 para los 3 casos; se distingue por presencia del campo 'warning'
        if (body?.warning) {
            // Distinguir desync (operación guardada) de insuficiente (rollback) por el mensaje
            const esInsuficiente = typeof body.warning === 'string' &&
                body.warning.toLowerCase().includes('insuficiente');
            if (esInsuficiente) {
                return { insuficiente: true, warning: body.warning, item: body.item } as IBodegaStockInsuficiente;
            }
            return { desync: true, warning: body.warning, item: body.item } as IBodegaStockSyncWarning;
        }

        return body as IBodegaTransitoItem;
    } catch (error: any) {
        if (error.response?.status === 409) {
            throw new Error(error.response.data?.message || 'El nombre o código del producto ya está en uso');
        }
        if (error.response?.status === 410 || error.response?.status === 404) {
            const err = new Error(error.response.data?.message || 'El registro fue eliminado antes de procesar la petición.');
            (err as any).status = 410;
            throw err;
        }
        throw new Error(error.response?.data?.message || 'Error al actualizar bodega de tránsito');
    }
};
