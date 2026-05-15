/**
 * SERVICIO DE INVENTARIO - ADAPTADOR FRONTEND ↔ BACKEND
 * Transforma los DTOs del backend al formato que espera el frontend
 *
 * Ubicación: src/services/inventario-service.ts
 */

import api from '../config/Axios';
import {
    IProducto,
    ICrearProducto,
    IActualizarProducto,
    IFiltrosInventarioResponse,
    IInventoryPageRequest,
    IInventoryPageItem,
    IInventoryPageResponse,
    IValidateStockRequest,
    IValidateStockConflictResponse,
    IProductoRecetaSelection
} from '../types/producto.types';
import { ISincronizarInventarioExcelResultado } from '../types/inventario.types';

/**
 * Obtiene las categorías y unidades de medida para los filtros
 */
export const obtenerFiltrosInventarioService = async (): Promise<IFiltrosInventarioResponse> => {

    try {
        const response = await api.get<IFiltrosInventarioResponse>('/inventario/filters');
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar los filtros del inventario'
        );
    }
};

/**
 * DTO que viene del backend
 */
interface BackendInventarioDTO {
    idInventario: number;
    idProducto: number;
    nombreProducto: string;
    descripcionProducto: string;
    nombreCategoria: string;
    unidadMedida: string;
    stock: number;
    stockLimitMin: number;
    estadoStock?: string;
    esFraccionario?: boolean;
}

/**
 * DTO para crear inventario en backend
 */
interface BackendCrearInventarioDTO {
    nombreProducto: string;
    codigoProducto?: string;
    codProducto?: string;
    descripcionProducto: string;
    idCategoria: number;
    idUnidadMedida: number;
    stock: number;
    stockLimit: number;
}

/**
 * DTO para actualizar inventario en backend response
 */
interface InventoryWithProductUpdateDTO {
    idInventario: number;
    idProducto: number;
    nombreProducto: string;
    descripcionProducto: string;
    codigoProducto?: string;
    idCategoria: number;
    idUnidadMedida: number;
    stock: number;
    stockLimit: number;
    tipoMovimiento: string | null;
    stockEnVista: number;
    delta: number | null;
    ajustePositivo?: boolean | null;
}

/**
 * Transforma el DTO del backend al formato del frontend
 * IMPORTANTE: Guardamos idInventario en el objeto para usarlo en actualizaciones
 */
const transformarBackendAFrontend = (backendDTO: BackendInventarioDTO): IProducto => {
    return {
        id: backendDTO.idProducto.toString(),
        nombre: backendDTO.nombreProducto,
        descripcion: backendDTO.descripcionProducto || '',
        codProducto: (backendDTO as any).codProducto,
        categoria: backendDTO.nombreCategoria,
        unidadMedida: backendDTO.unidadMedida,
        stock: backendDTO.stock,
        stockMinimo: backendDTO.stockLimitMin,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        // Guardamos idInventario como propiedad interna (no declarada en IProducto pero JS lo permite)
        _idInventario: backendDTO.idInventario,
        _esFraccionario: backendDTO.esFraccionario,
    } as IProducto;
};

/**
 * Valida el stock antes de proceder con una actualización para evitar conflictos
 * @param request Datos de validación (idInventario y stock actual en UI)
 * @returns true si no hay conflictos, o el objeto actualizado si hay conflicto (409)
 */
export const validateStockBeforeUpdatingService = async (request: IValidateStockRequest): Promise<boolean | IValidateStockConflictResponse> => {

    try {
        const response = await api.post<boolean | IValidateStockConflictResponse>(
            '/inventario/validate-stock-before-updating',
            request
        );

        return response.data;

    } catch (error: any) {

        if (error.response?.status === 410) {
            const goneError = new Error(
                error.response.data?.message ||
                'El inventario fue eliminado por otro usuario antes de procesar la petición.'
            );
            (goneError as any).status = 410;
            throw goneError;
        }

        if (error.response?.status === 409) {
            // Retornar el objeto de conflicto directamente para que el frontend lo use
            return error.response.data as IValidateStockConflictResponse;
        }

        throw new Error(
            error.response?.data?.message ||
            'Error al validar el estado del inventario'
        );
    }
};

/**
 * Obtiene todos los productos activos del inventario
 */
export const obtenerProductosService = async (): Promise<IProducto[]> => {

    try {
        const response = await api.get<BackendInventarioDTO[]>(
            '/inventario/find-all-inventories-active/'
        );

        const productosTransformados = response.data.map(transformarBackendAFrontend);

        return productosTransformados;

    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar los productos del inventario'
        );
    }
};

/**
 * Obtiene todos los productos activos para selección en recetas/solicitudes
 * GET /v1/producto/find-all-product-active-for-option
 */
export const obtenerProductosParaRecetaService = async (): Promise<IProductoRecetaSelection[]> => {
    try {
        const response = await api.get<IProductoRecetaSelection[]>(
            '/producto/find-all-product-active-for-option'
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar los productos'
        );
    }
};


/**
 * Obtiene un producto por su ID
 */
export const obtenerProductoPorIdService = async (id: string): Promise<IProducto> => {

    try {
        // Convertir string a number para el backend
        const idNumerico = parseInt(id);

        const response = await api.get<BackendInventarioDTO>(
            `/inventario/id-activo/${idNumerico}/true`
        );

        const producto = transformarBackendAFrontend(response.data);

        return producto;

    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            `Producto con ID ${id} no encontrado`
        );
    }
};

/**
 * Crea un nuevo producto en el inventario
 */
export const crearProductoService = async (productoData: ICrearProducto): Promise<boolean> => {

    // Validaciones
    if (!productoData.nombre || productoData.nombre.trim() === '') {
        throw new Error('El nombre del producto es requerido');
    }

    if (productoData.stock < 0) {
        throw new Error('El stock no puede ser negativo');
    }

    if (productoData.stockMinimo < 0) {
        throw new Error('El stock mínimo no puede ser negativo');
    }

    try {
        // Transformar al formato del backend
        const backendDTO: BackendCrearInventarioDTO = {
            nombreProducto: productoData.nombre.trim(),
            codigoProducto: productoData.codProducto?.trim(),
            descripcionProducto: productoData.descripcion.trim(),
            idCategoria: productoData.idCategoria,
            idUnidadMedida: productoData.idUnidadMedida,
            stock: productoData.stock,
            stockLimit: productoData.stockMinimo,
        };

        const response = await api.post<boolean>(
            '/inventario/create-inventory-with-product',
            backendDTO
        );

        return response.data;

    } catch (error: any) {

        // Manejar errores específicos del backend
        if (error.response?.status === 400) {
            throw new Error(
                error.response.data?.message ||
                'Datos inválidos para crear el producto'
            );
        }

        throw new Error(
            error.response?.data?.message ||
            'Error al crear el producto'
        );
    }
};

export interface IStockSyncWarning {
    desync: true;
    warning: string;
    item: IInventoryPageItem;
}

export interface IStockInsuficiente {
    insuficiente: true;
    warning: string;
    item: IInventoryPageItem;
}

/**
 * Actualiza un producto existente
 */
export const actualizarProductoService = async (productoData: IActualizarProducto): Promise<IInventoryPageItem | IStockSyncWarning | IStockInsuficiente> => {

    try {
        const idProductoNumerico = parseInt(productoData.id);
        const idInventario = productoData.idInventario;

        if (!idInventario) {
            throw new Error('No se proporcionó el ID de inventario del producto');
        }

        const stockEnVista = productoData.stockEnVista ?? productoData.stock ?? 0;
        // delta null = sin movimiento de stock (solo actualiza metadata / stockLimit)
        const hayMovimiento = productoData.tipoMovimiento && (productoData.delta ?? 0) > 0;
        const delta = hayMovimiento ? (productoData.delta ?? null) : null;
        const tipoMovimiento = hayMovimiento ? productoData.tipoMovimiento : null;

        const backendDTO: InventoryWithProductUpdateDTO = {
            idInventario: idInventario,
            idProducto: idProductoNumerico,
            nombreProducto: productoData.nombre?.trim() || '',
            codigoProducto: productoData.codProducto?.trim() || '',
            descripcionProducto: productoData.descripcion?.trim() || '',
            idCategoria: productoData.idCategoria,
            idUnidadMedida: productoData.idUnidadMedida,
            stock: stockEnVista,
            stockLimit: productoData.stockMinimo ?? 0,
            tipoMovimiento,
            stockEnVista,
            delta,
            ajustePositivo: productoData.ajustePositivo ?? null,
        };

        const response = await api.patch<IInventoryPageItem>(
            '/inventario/update-inventory-with-product',
            backendDTO
        );

        return response.data;

    } catch (error: any) {

        // 409 desync: operación exitosa pero stock estaba desactualizado → { warning, item }
        if (error.response?.status === 409 && error.response.data?.warning) {
            const body = error.response.data;
            return { desync: true, warning: body.warning, item: body.item } as IStockSyncWarning;
        }

        // 409 conflict: nombre o código duplicado
        if (error.response?.status === 409) {
            throw new Error(
                error.response.data?.message ||
                'El nombre o código del producto ya está en uso'
            );
        }

        if (error.response?.status === 410 || error.response?.status === 404) {
            const goneError = new Error(
                error.response.data?.message ||
                'El inventario fue eliminado antes de procesar la petición.'
            );
            (goneError as any).status = 410;
            throw goneError;
        }

        if (error.response?.status === 422) {
            const body = error.response.data;
            if (body?.item) {
                return { insuficiente: true, warning: body.warning || body.message || 'Stock insuficiente', item: body.item } as IStockInsuficiente;
            }
            throw new Error(body?.message || body?.warning || 'Stock insuficiente para realizar la operación');
        }

        if (error.response?.status === 400) {
            throw new Error(
                error.response.data?.message ||
                'Datos inválidos para actualizar el producto'
            );
        }

        throw new Error(
            error.response?.data?.message ||
            'Error al actualizar el producto'
        );
    }
};

/**
 * Elimina un producto (eliminación lógica)
 */
export const eliminarProductoService = async (id: string): Promise<boolean> => {

    try {
        // Primero obtener el producto para conseguir el idInventario
        const producto = await obtenerProductoPorIdService(id);

        // Obtener el idInventario del producto
        const idInventario = (producto as any)._idInventario;

        if (!idInventario) {
            throw new Error('No se pudo obtener el ID de inventario del producto');
        }

        // Usar el idInventario para eliminar
        await api.put(
            `/inventario/update-active-value-product-false/${idInventario}`
        );

        return true;

    } catch (error: any) {

        if (error.response?.status === 404) {
            throw new Error(`Producto con ID ${id} no encontrado`);
        }

        if (error.response?.status === 400) {
            throw new Error(
                error.response.data?.message ||
                'No se puede eliminar el producto (puede tener stock disponible)'
            );
        }

        throw new Error(
            error.response?.data?.message ||
            'Error al eliminar el producto'
        );
    }
};

/**
 * Realiza una eliminación lógica (soft delete) del inventario con producto
 */
export const softDeleteInventarioService = async (idInventario: number): Promise<boolean> => {

    try {
        const response = await api.delete<any>(
            `/inventario/soft-delete-inventory-with-product/${idInventario}`
        );


        // Caso 204: No hay contenido, pero HTTP indica éxito.
        if (response.status === 204) return true;

        // Caso con cuerpo: Revisar si el backend envió false explícitamente.
        if (response.data === false || response.data === 'false') return false;

        // Caso con cuerpo exitoso: "true", true o simplemente status 2xx.
        return response.status >= 200 && response.status < 300;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'No se pudo completar la eliminación del inventario'
        );
    }
};

/**
 * Obtiene los productos del inventario de forma paginada y con filtros dinámicos
 */
export const obtenerProductosPaginadosService = async (request: IInventoryPageRequest): Promise<IInventoryPageResponse> => {

    try {
        const response = await api.post<IInventoryPageResponse>(
            '/inventario/paged-inventory',
            request
        );

        const data = response.data;
        if (!data) throw new Error('El backend no devolvió datos');


        // El backend podría devolver items o data (según versiones)
        const items = data.items || (data as any).data || [];
        const totalItems = data.totalItems ?? (data as any).totalRegistros ?? 0;
        const totalPages = data.totalPages ?? (data as any).totalPaginas ?? 1;


        // Normalizamos la respuesta
        return {
            ...data,
            items,
            totalItems,
            totalPages
        };

    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar los productos del inventario'
        );
    }
};

/**
 * Busca productos en el inventario por código
 */
export const buscarProductosPorCodigoService = async (codigo: string, page: number = 1, pageSize: number = 10): Promise<IInventoryPageResponse> => {

    try {
        const response = await api.post<IInventoryPageResponse>(
            '/inventario/search-inventory-by-code',
            { term: codigo, page, pageSize }
        );

        const data = response.data;
        if (!data) throw new Error('El backend no devolvió datos');

        const items = data.items || (data as any).data || [];
        const totalItems = data.totalItems ?? (data as any).totalRegistros ?? 0;
        const totalPages = data.totalPages ?? (data as any).totalPaginas ?? 1;

        return {
            ...data,
            items,
            totalItems,
            totalPages
        };

    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar los productos del inventario'
        );
    }
};

/**
 * Busca productos en el inventario por término global (nombre o descripción)
 */
export const buscarProductosService = async (term: string, page: number = 1, pageSize: number = 10): Promise<IInventoryPageResponse> => {

    try {
        const response = await api.post<IInventoryPageResponse>(
            '/inventario/search-inventory',
            { term, page, pageSize }
        );

        const data = response.data;
        if (!data) throw new Error('El backend no devolvió datos');

        // Normalizamos la respuesta igual que obtenerProductosPaginadosService
        const items = data.items || (data as any).data || [];
        const totalItems = data.totalItems ?? (data as any).totalRegistros ?? 0;
        const totalPages = data.totalPages ?? (data as any).totalPaginas ?? 1;

        return {
            ...data,
            items,
            totalItems,
            totalPages
        };

    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al realizar la búsqueda en el inventario'
        );
    }
};

/**
 * Transforma un item de la página de inventario al formato IProducto para compatibilidad UI
 */
export const transformarPageItemAProducto = (item: IInventoryPageItem): IProducto => {
    // Si la estructura no es la esperada (nombres directos vs anidado)
    const idProducto = item.producto?.idProducto ?? (item as any).idProducto ?? 0;
    const nombre = item.producto?.nombre ?? (item as any).nombreProducto ?? 'Sin nombre';
    const categoria = item.producto?.categoria?.nombre ?? (item as any).nombreCategoria ?? 'Sin categoría';
    const unidad = item.producto?.unidad?.nombre ?? (item as any).nombreUnidad ?? (item as any).unidadMedida ?? 'Sin unidad';
    const stockActual = item.stockActual ?? (item as any).stock ?? 0;
    const stockMinimo = item.stockMinimo ?? (item as any).stockLimit ?? 0;

    const codProducto = item.producto?.codProducto ?? item.codProducto ?? (item as any).codigoProducto ?? undefined;
    const descripcion = item.producto?.descripcionProducto ?? item.descripcionProducto ?? (item as any).descripcion ?? '';

    return {
        id: idProducto.toString(),
        nombre,
        descripcion: descripcion,
        codProducto: codProducto,
        categoria,
        unidadMedida: unidad,
        stock: stockActual,
        stockMinimo: stockMinimo,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        _idInventario: item.idInventario,
        _esFraccionario: item.esFraccionario
    } as IProducto;
};

export interface IBulkProductoInventoryListing {
    stock: number;
    nombreProducto: string;
    idInventario: number;
    idProducto: number;
    detalles: string;
    esFraccionario: boolean;
}

export interface BulkInventoryRequestDTO {
    term?: string;
    page: number;
}

export interface IBulkInventoryResponse {
    content: IBulkProductoInventoryListing[];
    page: number;
    limit: number;
    totalPages: number;
    totalElements: number;
}

/**
 * Obtiene la lista paginada de productos para los procesos masivos
 */
export const obtenerBulkProductoInventoryListingService = async (request: BulkInventoryRequestDTO): Promise<IBulkInventoryResponse> => {
    try {
        const response = await api.post<IBulkInventoryResponse>('/inventario/massive-producto-inventory-listing', request);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar la lista de productos para procesos masivos'
        );
    }
};

export interface IBulkUpdateStockRequest {
    idInventario: number;
    delta: number;
    stockEnVista: number;
    tipoMovimiento: string;
}

export interface IBulkItemResult {
    idInventario: number;
    producto: string;
    stockResultante: number;
    mensaje: string;
}

export interface IBulkProcessResult {
    exitosos: IBulkItemResult[];
    advertencias: IBulkItemResult[];
    errores: IBulkItemResult[];
}

/**
 * Envía la lista completa de ítems al backend para procesamiento masivo atómico.
 * El backend maneja la validación, desincronización y errores internamente.
 */
export const bulkUpdateInventoryStockService = async (requests: IBulkUpdateStockRequest[]): Promise<IBulkProcessResult> => {
    try {
        const response = await api.patch<IBulkProcessResult>('/inventario/bulk-update-inventory-stock', requests);
        return response.data;
    } catch (error: any) {
        let errorMsg = 'Error al procesar el stock masivo';
        if (typeof error.response?.data === 'string') {
            errorMsg = error.response.data;
        } else if (error.response?.data?.message) {
            errorMsg = error.response.data.message;
        }
        throw new Error(errorMsg);
    }
};

export const sincronizarInventarioDesdeExcelService = async (
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
            `/inventario/sincronizar-excel${params}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || 'Error al procesar el Excel de inventario'
        );
    }
};