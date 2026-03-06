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
    tipoMovimiento: string;
    nombreProducto: string;
    codigoProducto?: string;
    descripcionProducto?: string;
    idCategoria: number;
    idUnidadMedida: number;
    stock: number;
    stockLimit: number;
}

/**
 * Servicio para actualizar un producto en la bodega de tránsito.
 * Endpoint: PATCH /v1/bodega-transito/update-warehouse-with-product
 */
export const actualizarBodegaTransitoConProductoService = async (data: WarehouseWithProductUpdateDTO): Promise<boolean> => {
    try {
        const response = await api.patch<boolean>('/bodega-transito/update-warehouse-with-product', data);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar bodega de tránsito:', error);
        throw error;
    }
};
