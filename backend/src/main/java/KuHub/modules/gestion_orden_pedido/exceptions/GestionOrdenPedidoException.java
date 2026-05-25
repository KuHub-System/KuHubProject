package KuHub.modules.gestion_orden_pedido.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class GestionOrdenPedidoException extends RuntimeException {
    private final HttpStatus status;

    public GestionOrdenPedidoException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
