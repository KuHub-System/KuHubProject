package KuHub.modules.gestion_receta.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class GestionRecetaException extends RuntimeException {
    private final HttpStatus status;

    public GestionRecetaException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
