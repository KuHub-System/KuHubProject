package KuHub.modules.pedido_semana_a_bodega.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class PedidoSemanaBodegaException extends RuntimeException {
    private final HttpStatus status;

    public PedidoSemanaBodegaException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
