package KuHub.modules.gestion_pedido.record;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * DTO para cambiar el estado de uno o varios pedidos de forma masiva.
 * Sigue el mismo patrón que ChangeSolicitationStatus en gestion_solicitud.
 *
 * Ejemplo de uso:
 *   { "idsPedidos": [1, 2, 3], "estado": "PROCESADO" }
 */
public record ChangePedidoStatusDTO(

        @NotEmpty(message = "La lista de pedidos no puede estar vacía")
        List<@NotNull(message = "El idPedido es obligatorio") Integer> idsPedidos,

        @NotNull(message = "El estado es obligatorio")
        String estado
) {}
