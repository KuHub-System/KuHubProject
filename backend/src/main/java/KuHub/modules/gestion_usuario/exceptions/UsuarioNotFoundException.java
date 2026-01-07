package KuHub.modules.gestion_usuario.exceptions;

/**
 * Excepción lanzada cuando no se encuentra un usuario
 */
public class UsuarioNotFoundException extends RuntimeException {

    public UsuarioNotFoundException(String mensaje) {
        super(mensaje);
    }

    public UsuarioNotFoundException(Integer idUsuario) {
        super("Usuario con ID " + idUsuario + " no encontrado");
    }

    public UsuarioNotFoundException(String campo, String valor) {
        super("Usuario con " + campo + " '" + valor + "' no encontrado");
    }
}