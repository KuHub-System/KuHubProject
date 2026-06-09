package KuHub.modules.asistente_ia.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Excepción de negocio del módulo de asistente IA.
 * Se lanza cuando Ollama no está disponible, da timeout o devuelve una respuesta vacía/ inválida.
 */
@Getter
public class AsistenteIaException extends RuntimeException {

    private final HttpStatus status;

    public AsistenteIaException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
