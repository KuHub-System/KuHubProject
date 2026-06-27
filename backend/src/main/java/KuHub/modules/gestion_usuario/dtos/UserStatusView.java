package KuHub.modules.gestion_usuario.dtos;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.time.LocalDateTime;

/**
 * Proyección ligera del estado de conexión de un usuario.
 * Solo expone los datos necesarios para refrescar la columna "Estado" del
 * frontend (en línea / desconectado / inactivo) sin re-consultar la lista completa.
 */
@JsonPropertyOrder({ "email", "ultimoAcceso", "activo" })
public interface UserStatusView {
    String getEmail();
    LocalDateTime getUltimoAcceso();
    Boolean getActivo();
}
