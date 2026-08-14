package KuHub.modules.gestion_proveedor.dtos.response;

import KuHub.utils.PaginationUtils;

import java.util.List;

/**
 * Record de response con una página de productos de un proveedor dentro de una
 * categoría específica, para el scroll infinito de ProductosProveedor.tsx.
 */
public record ProveedorProductosPageDTO(
        List<ProductoConPrecioDTO> data,
        Short idCategoria,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {
    public static ProveedorProductosPageDTO of(
            List<ProductoConPrecioDTO> data,
            Short idCategoria,
            PaginationUtils.PagingResult paging,
            long totalRegistros
    ) {
        return new ProveedorProductosPageDTO(
                data,
                idCategoria,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                totalRegistros
        );
    }
}
