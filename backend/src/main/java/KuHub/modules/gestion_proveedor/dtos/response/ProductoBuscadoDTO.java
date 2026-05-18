package KuHub.modules.gestion_proveedor.dtos.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Record que representa un producto encontrado en la búsqueda global.
 */
public record ProductoBuscadoDTO(
        Integer idProducto,
        Integer idProveedorProducto,
        String codProducto,
        String nombreProducto,
        String nombreUnidad,
        String abreviatura,
        String marcaProducto,
        String formatoContenido,
        BigDecimal precioNeto,
        BigDecimal precioConIva,
        Boolean activo,
        LocalDateTime fechaActualizacion
) {
}
