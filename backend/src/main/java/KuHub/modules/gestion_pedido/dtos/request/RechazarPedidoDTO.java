package KuHub.modules.gestion_pedido.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos para rechazar (cancelar) un pedido completo desde el Conglomerado de Pedidos.
 * Al confirmarse, todas las solicitudes EN_PEDIDO del pedido pasan a RECHAZADA (liberando sus
 * reservas de stock) y el pedido pasa a RECHAZADO. Si {@code cancelarOrdenes} es true, además se
 * cancelan (CANCELADA) las Órdenes de Pedido vigentes asociadas. Acción irreversible.
 */
public record RechazarPedidoDTO(
        @NotBlank(message = "El motivo del rechazo es obligatorio")
        @Size(max = 500, message = "El motivo no puede exceder los 500 caracteres")
        String motivo,

        boolean cancelarOrdenes
) {}
