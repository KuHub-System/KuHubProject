package KuHub.modules.gestion_usuario.exceptions;

/**
 * Excepción lanzada cuando las credenciales de login son inválidas
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Email o contraseña incorrectos");
    }

    public InvalidCredentialsException(String mensaje) {
        super(mensaje);
    }
}