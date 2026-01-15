package KuHub.modules.gestion_usuario.dtos.proyection;

public interface UserIdNameView {
    // Mapea la columna ID_USUARIO
    Integer getIdUsuario();

    // Mapea la columna P_NOMBRE (Asumiendo que en tu Entity se llama 'primerNombre')
    String getPrimerNombre();

    // Mapea la columna S_NOMBRE (Asumiendo 'segundoNombre')
    String getSegundoNombre();

    // Mapea la columna APP_PATERNO (Asumiendo 'apellidoPaterno')
    String getApellidoPaterno();

    // Mapea la columna APP_MATERNO (Asumiendo 'apellidoMaterno')
    String getApellidoMaterno();
}
