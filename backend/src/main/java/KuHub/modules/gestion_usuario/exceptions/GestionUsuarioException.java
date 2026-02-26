package KuHub.modules.gestion_usuario.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class GestionUsuarioException extends RuntimeException {
    private final HttpStatus status;

    public GestionUsuarioException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
