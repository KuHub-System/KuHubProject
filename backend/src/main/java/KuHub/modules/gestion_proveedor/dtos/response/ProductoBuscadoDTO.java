package KuHub.modules.gestion_proveedor.dtos.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Record que representa un producto encontrado en la búsqueda global.
 * Incluye información del producto, unidad y precio del proveedor.
 */
public record ProductoBuscadoDTO(
        Integer idProducto,
        Integer idProveedorProducto,
        String codProducto,
        String nombreProducto,
        String nombreUnidad,
        String abreviatura,
        BigDecimal precioProducto,
        Boolean activo,
        LocalDateTime fechaActualizacion
) {
}
