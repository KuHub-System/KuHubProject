package KuHub.modules.gestion_orden_pedido.dtos.request;

import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CambiarEstadoOrdenPedidoDTO {

    @NotNull(message = "El estado es obligatorio")
    private EstadoOrdenPedido estado;
}
