package KuHub.modules.gestion_usuario.dtos.dtofilter.pro;

import java.time.LocalDateTime;

public interface UserAuthProjection {
    String getNombreCompleto();
    String getEmail();
    LocalDateTime getUltimoAcceso();
    String getUrlFotoPerfil();
    String getNombreRol();
    String getContrasena();
    Boolean getActivo();
}
