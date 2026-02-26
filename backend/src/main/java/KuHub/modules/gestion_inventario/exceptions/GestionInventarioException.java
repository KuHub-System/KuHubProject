package KuHub.modules.gestion_inventario.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class GestionInventarioException extends RuntimeException {
    private final HttpStatus status;

    public GestionInventarioException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
