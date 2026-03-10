package KuHub.modules.gestion_usuario.dtos;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.time.LocalDateTime;


@JsonPropertyOrder({
        "urlFotoPerfil",
        "nombreCompleto",
        "email",
        "username",
        "rolFormateado",
        "activo",
        "ultimoAcceso",
        "primerNombre",
        "segundoNombre",
        "apellidoPaterno",
        "apellidoMaterno"
})
public interface UsersView {
    String getUrlFotoPerfil();
    String getNombreCompleto();
    String getEmail();
    String getUsername();
    String getRolFormateado();
    Boolean getActivo();
    LocalDateTime getUltimoAcceso();

    // Campos individuales para el formulario de Update
    String getPrimerNombre();
    String getSegundoNombre();
    String getApellidoPaterno();
    String getApellidoMaterno();
}
