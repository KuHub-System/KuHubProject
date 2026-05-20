package KuHub.modules.gestion_orden_compra.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class GestionOrdenCompraException extends RuntimeException {
    private final HttpStatus status;

    public GestionOrdenCompraException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
