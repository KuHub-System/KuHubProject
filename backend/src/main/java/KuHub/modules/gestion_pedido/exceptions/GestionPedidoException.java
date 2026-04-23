package KuHub.modules.gestion_pedido.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Excepción base para el módulo de gestión de pedidos.
 */
@Getter
public class GestionPedidoException extends RuntimeException {
    private final HttpStatus status;

    public GestionPedidoException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public GestionPedidoException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }
}
