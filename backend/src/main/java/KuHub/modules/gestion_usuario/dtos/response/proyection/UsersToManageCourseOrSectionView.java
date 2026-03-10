package KuHub.modules.gestion_usuario.dtos.response.proyection;

/**
 * Proyección para listar usuarios administrativos y docentes
 * habilitados para gestionar asignaturas.
 */
public interface UsersToManageCourseOrSectionView {
    Integer getIdUsuario();
    String getNombreCompleto();
}
