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
    IActualizarProducto
} from '../types/producto.types';

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
}

/**
 * DTO para crear inventario en backend
 */
interface BackendCrearInventarioDTO {
    nombreProducto: string;
    descripcionProducto: string;
    nombreCategoria: string;
    unidadMedida: string;
    stock: number;
    stockLimitMin: number;
}

/**
 * DTO para actualizar inventario en backend
 */
interface BackendActualizarInventarioDTO {
    idInventario: number;
    idProducto: number;
    nombreProducto: string;
    descripcionProducto: string;
    nombreCategoria: string;
    unidadMedida: string;
    stock: number;
    stockLimitMin: number;
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
        categoria: backendDTO.nombreCategoria,
        unidadMedida: backendDTO.unidadMedida,
        stock: backendDTO.stock,
        stockMinimo: backendDTO.stockLimitMin,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        // Guardamos idInventario como propiedad interna (no declarada en IProducto pero JS lo permite)
        _idInventario: backendDTO.idInventario,
    } as IProducto;
};

/**
 * Obtiene todos los productos activos del inventario
 */
export const obtenerProductosService = async (): Promise<IProducto[]> => {
    console.log('📦 Obteniendo productos del inventario desde el backend');

    try {
        const response = await api.get<BackendInventarioDTO[]>(
            '/inventario/find-all-inventories-active/'
        );

        const productosTransformados = response.data.map(transformarBackendAFrontend);

        console.log(`✅ ${productosTransformados.length} productos obtenidos`);
        return productosTransformados;

    } catch (error: any) {
        console.error('❌ Error al obtener productos:', error);
        throw new Error(
            error.response?.data?.message ||
            'Error al cargar los productos del inventario'
        );
    }
};

/**
 * Obtiene un producto por su ID
 */
export const obtenerProductoPorIdService = async (id: string): Promise<IProducto> => {
    console.log(`🔍 Buscando producto con ID: ${id}`);

    try {
        // Convertir string a number para el backend
        const idNumerico = parseInt(id);

        const response = await api.get<BackendInventarioDTO>(
            `/inventario/id-activo/${idNumerico}/true`
        );

        const producto = transformarBackendAFrontend(response.data);

        console.log(`✅ Producto encontrado: ${producto.nombre}`);
        return producto;

    } catch (error: any) {
        console.error('❌ Error al obtener producto:', error);
        throw new Error(
            error.response?.data?.message ||
            `Producto con ID ${id} no encontrado`
        );
    }
};

/**
 * Crea un nuevo producto en el inventario
 */
export const crearProductoService = async (productoData: ICrearProducto): Promise<IProducto> => {
    console.log('➕ Creando nuevo producto:', productoData.nombre);

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
            descripcionProducto: productoData.descripcion.trim(),
            nombreCategoria: productoData.categoria.trim(),
            unidadMedida: productoData.unidadMedida.trim(),
            stock: productoData.stock,
            stockLimitMin: productoData.stockMinimo,
        };

        const response = await api.post<BackendInventarioDTO>(
            '/inventario/create-inventory-with-product/',
            backendDTO
        );

        const nuevoProducto = transformarBackendAFrontend(response.data);

        console.log(`✅ Producto creado: ${nuevoProducto.nombre} (ID: ${nuevoProducto.id})`);
        return nuevoProducto;

    } catch (error: any) {
        console.error('❌ Error al crear producto:', error);

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

/**
 * Actualiza un producto existente
 */
export const actualizarProductoService = async (productoData: IActualizarProducto): Promise<IProducto> => {
    console.log(`✏️ Actualizando producto ID: ${productoData.id}`);

    // Validaciones
    if (productoData.stock !== undefined && productoData.stock < 0) {
        throw new Error('El stock no puede ser negativo');
    }

    if (productoData.stockMinimo !== undefined && productoData.stockMinimo < 0) {
        throw new Error('El stock mínimo no puede ser negativo');
    }

    try {
        // Primero obtener el producto actual para tener idInventario y todos los datos
        const productoActual = await obtenerProductoPorIdService(productoData.id);

        // Convertir el ID a número
        const idProductoNumerico = parseInt(productoData.id);

        // Obtener el idInventario del producto (viene como propiedad interna)
        const idInventario = (productoActual as any)._idInventario;

        if (!idInventario) {
            throw new Error('No se pudo obtener el ID de inventario del producto');
        }

        // Transformar al formato del backend (merge con datos actuales)
        const backendDTO: BackendActualizarInventarioDTO = {
            idInventario: idInventario, // ✅ Usar el idInventario real del producto
            idProducto: idProductoNumerico,
            nombreProducto: productoData.nombre?.trim() || productoActual.nombre,
            descripcionProducto: productoData.descripcion?.trim() || productoActual.descripcion,
            nombreCategoria: productoData.categoria?.trim() || productoActual.categoria,
            unidadMedida: productoData.unidadMedida?.trim() || productoActual.unidadMedida,
            stock: productoData.stock ?? productoActual.stock,
            stockLimitMin: productoData.stockMinimo ?? productoActual.stockMinimo,
        };

        const response = await api.put<BackendActualizarInventarioDTO>(
            '/inventario/update-inventory-with-product/',
            backendDTO
        );

        const productoActualizado = transformarBackendAFrontend(response.data);

        console.log(`✅ Producto actualizado: ${productoActualizado.nombre}`);
        return productoActualizado;

    } catch (error: any) {
        console.error('❌ Error al actualizar producto:', error);

        if (error.response?.status === 400) {
            throw new Error(
                error.response.data?.message ||
                'Datos inválidos para actualizar el producto'
            );
        }

        if (error.response?.status === 404) {
            throw new Error(`Producto con ID ${productoData.id} no encontrado`);
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
    console.log(`🗑️ Eliminando producto ID: ${id}`);

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

        console.log('✅ Producto eliminado (desactivado) exitosamente');
        return true;

    } catch (error: any) {
        console.error('❌ Error al eliminar producto:', error);

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