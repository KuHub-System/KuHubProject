package KuHub.modules.gestionusuario.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * DTO para respuesta de Usuario
 * NO incluye la contraseña por seguridad
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioResponseDTO {

    private Integer idUsuario;
    private Integer idRol;
    private String nombreRol;
    private String primerNombre;
    private String segundoNombre;
    private String apellidoPaterno;
    private String apellidoMaterno;
    private String nombreCompleto;
    private String email;
    private String contrasena;
    private String username;
    private String fotoPerfil;
    private Boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime ultimoAcceso;
}