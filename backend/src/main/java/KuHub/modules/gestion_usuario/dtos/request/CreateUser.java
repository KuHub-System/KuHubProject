package KuHub.modules.gestion_usuario.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateUser {
    @NotBlank(message = "El primer nombre es obligatorio")
    @Size(max = 50, message = "El nombre no puede exceder los 50 caracteres")
    private String primeroNombre;

    @Size(max = 50, message = "El segundo nombre no puede exceder los 50 caracteres")
    private String segundoNombre; // Opcional según tu SQL (no tiene NOT NULL)

    @NotBlank(message = "El apellido paterno es obligatorio")
    @Size(max = 50, message = "El apellido paterno no puede exceder los 50 caracteres")
    private String apellidoPaterno;

    @Size(max = 50, message = "El apellido materno no puede exceder los 50 caracteres")
    private String apellidoMaterno; // Opcional

    @NotBlank(message = "El nombre de usuario es obligatorio")
    @Size(min = 3, max = 50, message = "El username debe tener entre 3 y 50 caracteres")
    private String username;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Debe proporcionar un formato de email válido")
    @Size(max = 75, message = "El email no puede exceder los 75 caracteres")
    private String email;

    @NotBlank(message = "La contraseña es obligatoria")
    /* Nota: La validación es para la contraseña en crudo antes de Bcrypt.
       El límite de 60 en DB es para el hash generado.
    */
    @Size(min = 8, max = 30, message = "La contraseña debe tener entre 8 y 30 caracteres")
    private String password;

    @NotNull(message = "El rol es obligatorio")
    @Positive(message = "ID de rol no válido")
    private Integer idRol;
}
