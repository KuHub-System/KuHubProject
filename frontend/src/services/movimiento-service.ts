/**
 * SERVICIO DE MOVIMIENTOS - BACKEND INTEGRATION
 * Conecta con el endpoint de filtrado avanzado de movimientos
 */

import api from '../config/Axios';

/**
 * DTO para la solicitud de filtrado de movimientos (MotionFilterRequestDTO)
 */
export interface IMotionFilterRequest {
    page: number;
    nombreProducto: string;
    nombreResponsable: string;
    tipoMovimiento: 'ENTRADA_INVENTARIO' | 'ENTRADA_BODEGA' | 'SALIDA_INVENTARIO' | 'SALIDA_BODEGA' | 'TRASLADO' | 'MERMA_INVENTARIO' | 'MERMA_BODEGA' | 'AJUSTE_INVENTARIO' | 'AJUSTE_BODEGA' | 'DEVOLUCION' | 'TODOS';
    orden: 'MAS_RECIENTES' | 'MAS_ANTIGUOS' | 'MENOR_CANTIDAD' | 'MAYOR_CANTIDAD';
    fechaInicio: string | null;
    fechaFin: string | null;
}

/**
 * DTO para la respuesta de un movimiento (MotionAnswerDTO)
 */
export interface IMotionAnswer {
    nombreProducto: string;
    nombreCategoria: string;
    tipoMovimiento: string;
    stockMovimiento: number;
    fechaMovimiento: string;
    nombreUsuario: string;
    observacion?: string;
}

/**
 * DTO para la respuesta paginada de movimientos (PaginatedMotionDTO)
 */
export interface IPaginatedMotionResponse {
    content: IMotionAnswer[];
    pagination: {
        page: number;
        limit: number;
        offset: number;
        totalPages: number;
    };
}

/**
 * Obtiene los movimientos filtrados desde el backend con paginación
 * @param request Filtros de búsqueda (MotionFilterRequestDTO)
 * @returns Respuesta paginada con movimientos (PaginatedMotionDTO)
 */
export const findMovimientosConFiltros = async (request: IMotionFilterRequest): Promise<IPaginatedMotionResponse> => {

    try {
        const response = await api.post<IPaginatedMotionResponse>(
            '/movimiento/find-all-motion-with-filter',
            request
        );

        return response.data;

    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar el historial de movimientos'
        );
    }
};
