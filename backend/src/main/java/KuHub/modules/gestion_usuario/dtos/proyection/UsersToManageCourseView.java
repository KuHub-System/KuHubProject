package KuHub.modules.gestion_usuario.dtos.proyection;

/**
 * Proyección para listar usuarios administrativos y docentes
 * habilitados para gestionar asignaturas.
 */
public interface UsersToManageCourseView {
    Integer getIdUsuario();
    String getNombreCompleto();
}
