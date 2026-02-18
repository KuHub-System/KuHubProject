package KuHub.modules.gestion_usuario.dtos.dtofilter;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO para la respuesta de autenticación personalizada en KuHub.
 * Filtra los datos del usuario y concatena el nombre desde la BD.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAuth {
    private String nombreCompleto;
    private String email;
    private LocalDateTime ultimoAcceso;
    private String nombreRol;
    private String urlFotoPerfil;
}
