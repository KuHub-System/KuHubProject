package KuHub.modules.gestion_academica.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class GestionAcademicaException extends RuntimeException {
    private final HttpStatus status;

    public GestionAcademicaException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
