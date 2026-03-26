package KuHub.modules.gestion_pedido.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO de request para el endpoint POST /pedido/preparar-entrega.
 * Contiene el ID de la solicitud y la lista de productos con
 * las cantidades reales a descontar de bodega de tránsito.
 */
public record PrepararEntregaDTO(

        @NotNull(message = "El ID de la solicitud es obligatorio")
        Integer idSolicitud,

        @NotEmpty(message = "Debe incluir al menos un producto")
        @Valid
        List<ProductoPreparadoDTO> productos

) {
    /**
     * Producto individual con la cantidad confirmada a entregar
     * y el stock que el usuario veía al abrir el modal (para detectar desincronización).
     */
    public record ProductoPreparadoDTO(

            @NotNull(message = "El ID de producto es obligatorio")
            Integer idProducto,

            @NotNull(message = "El stock en vista es obligatorio")
            BigDecimal stockEnVista,

            @NotNull(message = "La cantidad a entregar es obligatoria")
            @DecimalMin(value = "0.001", message = "La cantidad a entregar debe ser mayor a 0")
            BigDecimal cantidadAEntregar

    ) {}
}
