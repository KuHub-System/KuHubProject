package KuHub.modules.gestion_pedido.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateOrder(

        @NotNull(message = "La fecha de inicio es obligatoria")
        LocalDate fechaInicio,

        @NotNull(message = "La fecha de fin es obligatoria")
        LocalDate fechaFin,

        @NotEmpty(message = "Debe incluir al menos una solicitud para consolidar")
        @Valid
        List<SolicitudItemRequest> solicitudes,

        @NotEmpty(message = "El detalle de productos consolidados no puede estar vacío")
        @Valid
        List<DetalleItemRequest> detalles
) {

    /**
     * Representa cada solicitud individual que compone este pedido.
     * Necesario para llenar la tabla 'pedido_solicitud'.
     */
    public static record SolicitudItemRequest(
            @NotNull(message = "El ID de solicitud es obligatorio")
            Integer idSolicitud,

            @NotNull(message = "La fecha solicitada es obligatoria para la integridad de la FK")
            LocalDate fechaSolicitada
    ) {}

    /**
     * Representa la suma consolidada de un producto para toda la semana.
     * Necesario para llenar la tabla 'detalle_pedido'.
     */
    public static record DetalleItemRequest(
            @NotNull(message = "El ID del producto es obligatorio")
            Integer idProducto,

            @NotNull(message = "La cantidad total es obligatoria")
            BigDecimal cantidadTotal
    ) {}
}