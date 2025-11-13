package KuHub.modules.gestionusuario.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para crear o actualizar un Usuario
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioRequestDTO {

    @NotNull(message = "El ID del rol es obligatorio")
    private Integer idRol;

    @NotBlank(message = "El primer nombre es obligatorio")
    @Size(max = 100, message = "El primer nombre no puede exceder 100 caracteres")
    private String primerNombre;

    @Size(max = 100, message = "El segundo nombre no puede exceder 100 caracteres")
    private String segundoNombre;


    @Size(max = 100, message = "El apellido paterno no puede exceder 100 caracteres")
    private String apellidoPaterno;

    @Size(max = 100, message = "El apellido materno no puede exceder 100 caracteres")
    private String apellidoMaterno;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email debe ser válido")
    @Size(max = 255, message = "El email no puede exceder 255 caracteres")
    private String email;

    @Size(max = 100, message = "El username no puede exceder 100 caracteres")
    private String username;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, max = 255, message = "La contraseña debe tener entre 6 y 255 caracteres")
    private String contrasena;

    private String fotoPerfil;

    private Boolean activo = true;
}