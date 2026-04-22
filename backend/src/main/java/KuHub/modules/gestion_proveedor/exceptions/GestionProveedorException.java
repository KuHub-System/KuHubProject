package KuHub.modules.gestion_proveedor.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class GestionProveedorException extends RuntimeException {
    private final HttpStatus status;

    public GestionProveedorException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
