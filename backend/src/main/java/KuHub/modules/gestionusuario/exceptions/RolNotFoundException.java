package KuHub.modules.gestionusuario.exceptions;

/**
 * Excepción lanzada cuando no se encuentra un rol
 */
public class RolNotFoundException extends RuntimeException {

    public RolNotFoundException(String mensaje) {
        super(mensaje);
    }

    public RolNotFoundException(Integer idRol) {
        super("Rol con ID " + idRol + " no encontrado");
    }

    public RolNotFoundException(String campo, String valor) {
        super("Rol con " + campo + " '" + valor + "' no encontrado");
    }
}