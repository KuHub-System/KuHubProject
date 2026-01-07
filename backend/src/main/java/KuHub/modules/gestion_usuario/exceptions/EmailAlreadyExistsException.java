package KuHub.modules.gestion_usuario.exceptions;

/**
 * Excepción lanzada cuando se intenta registrar un email que ya existe
 */
public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String email) {
        super("El email '" + email + "' ya está registrado en el sistema");
    }

    public EmailAlreadyExistsException(String mensaje, String email) {
        super(mensaje);
    }
}