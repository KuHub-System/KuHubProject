package KuHub.modules.gestion_proveedor.dtos.response;

import java.util.List;

/**
 * Record que contiene los resultados de búsqueda global de productos.
 * Agrupa productos encontrados por proveedor y categoría.
 */
public record BusquedaProductosGlobalDTO(
        Integer idProveedor,
        String rutProveedor,
        String nombreDistribuidora,
        String nombreProveedor,
        String emailProveedor,
        String telefonoProveedor,
        String estadoProveedor,
        Integer cantidadProductosActivos,
        List<CategoryProductsDTO> categorias
) {
}
