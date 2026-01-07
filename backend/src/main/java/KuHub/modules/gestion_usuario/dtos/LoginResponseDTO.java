package KuHub.modules.gestion_usuario.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para respuesta de login exitoso
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseDTO {

    private UsuarioResponseDTO usuario;
    private String token;
    private String mensaje;

    public LoginResponseDTO(UsuarioResponseDTO usuario, String token) {
        this.usuario = usuario;
        this.token = token;
        this.mensaje = "Login exitoso";
    }
}