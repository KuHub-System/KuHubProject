/**
 * SERVICIO DE MOVIMIENTOS - BACKEND INTEGRATION
 * Conecta con el endpoint de filtrado avanzado de movimientos
 */

import api from '../config/Axios';
/**
 * DTO para la solicitud de filtrado de movimientos (MotionFilterRequestDTO)
 */
export interface IMotionFilterRequest {
    nombreProducto: string;
    nombreResponsable: string;
    tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'MERMA' | 'AJUSTE' | 'DEVOLUCION' | 'TODOS';
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
 * Obtiene los movimientos filtrados desde el backend
 * @param request Filtros de búsqueda (MotionFilterRequestDTO)
 * @returns Lista de movimientos (MotionAnswerDTO[])
 */
export const findMovimientosConFiltros = async (request: IMotionFilterRequest): Promise<IMotionAnswer[]> => {

    try {
        const response = await api.post<IMotionAnswer[]>(
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
