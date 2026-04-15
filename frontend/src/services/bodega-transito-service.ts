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
