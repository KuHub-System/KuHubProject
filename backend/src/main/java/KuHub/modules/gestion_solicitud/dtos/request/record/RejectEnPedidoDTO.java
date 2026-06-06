package KuHub.modules.gestion_solicitud.dtos.request.record;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Datos para rechazar una solicitud en estado EN_PEDIDO.
 * Al confirmarse, se restan automáticamente las cantidades de la solicitud del pedido asociado
 * y se desvincula del mismo. Solo es válido si el pedido no tiene una Orden de Pedido activa
 * (con estado distinto a CANCELADA).
 */
public record RejectEnPedidoDTO(
        @NotNull(message = "El idSolicitud es obligatorio")
        Integer idSolicitud,

        @NotBlank(message = "El motivo del rechazo es obligatorio")
        @Size(max = 500, message = "El motivo no puede exceder los 500 caracteres")
        String motivo
) {}
