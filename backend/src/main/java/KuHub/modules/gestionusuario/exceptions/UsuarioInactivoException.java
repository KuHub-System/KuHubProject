package KuHub.modules.gestionusuario.exceptions;

/**
 * Excepción lanzada cuando un usuario inactivo intenta hacer login
 */
public class UsuarioInactivoException extends RuntimeException {

    public UsuarioInactivoException() {
        super("El usuario está inactivo. Contacte al administrador");
    }

    public UsuarioInactivoException(String mensaje) {
        super(mensaje);
    }
}