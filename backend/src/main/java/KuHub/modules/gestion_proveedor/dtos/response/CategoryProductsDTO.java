package KuHub.modules.gestion_proveedor.dtos.response;

import java.util.List;

/**
 * Record que agrupa productos por categoría en la búsqueda global.
 * Mapea la estructura JSON: { nombreCategoria, productos [...] }
 */
public record CategoryProductsDTO(
        String nombreCategoria,
        List<ProductoBuscadoDTO> productos
) {
}
