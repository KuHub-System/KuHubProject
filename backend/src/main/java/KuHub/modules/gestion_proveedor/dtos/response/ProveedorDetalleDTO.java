package KuHub.modules.gestion_proveedor.dtos.response;

import java.util.List;
import java.util.Map;

/**
 * Record de response con el detalle completo de un proveedor,
 * incluyendo sus productos agrupados por categoría.
 */
public record ProveedorDetalleDTO(
        Integer idProveedor,
        String rutProveedor,
        String nombreDistribuidora,
        String nombreProveedor,
        String telefonoProveedor,
        String emailProveedor,
        String estadoProveedor,
        Boolean activo,
        String fechaCreacion,
        Long cantidadProductosActivos,
        /** Productos agrupados por nombre de categoría */
        Map<String, List<ProductoConPrecioDTO>> productosPorCategoria
) {
}
