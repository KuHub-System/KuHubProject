package KuHub.modules.gestionusuario.exceptions;

/**
 * Excepción lanzada cuando se intenta registrar un username que ya existe
 */
public class UsernameAlreadyExistsException extends RuntimeException {

    public UsernameAlreadyExistsException(String username) {
        super("El username '" + username + "' ya está registrado en el sistema");
    }

    public UsernameAlreadyExistsException(String mensaje, String username) {
        super(mensaje);
    }
}