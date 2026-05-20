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
        /** Dirección opcional. Se usa en la cabecera C3 de la plantilla Excel y en el modal de edición. */
        String direccionProveedor,
        String estadoProveedor,
        Boolean activo,
        String fechaCreacion,
        Long cantidadProductosActivos,
        /** Productos agrupados por nombre de categoría */
        Map<String, List<ProductoConPrecioDTO>> productosPorCategoria,
        /** Días y horarios de entrega configurados */
        List<DiaEntregaResponseDTO> diasEntrega
) {
}
