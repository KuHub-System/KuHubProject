package KuHub.modules.gestion_usuario.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateUser {
    @NotBlank(message = "El primer nombre es obligatorio")
    @Size(max = 50, message = "El nombre no puede exceder los 50 caracteres")
    private String primeroNombre;

    @Size(max = 50, message = "El segundo nombre no puede exceder los 50 caracteres")
    private String segundoNombre;

    @NotBlank(message = "El apellido paterno es obligatorio")
    @Size(max = 50, message = "El apellido paterno no puede exceder los 50 caracteres")
    private String apellidoPaterno;

    @Size(max = 50, message = "El apellido materno no puede exceder los 50 caracteres")
    private String apellidoMaterno;

    @NotBlank(message = "El nombre de usuario es obligatorio")
    @Size(min = 3, max = 50, message = "El username debe tener entre 3 y 50 caracteres")
    private String username;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Debe proporcionar un formato de email válido")
    @Size(max = 75, message = "El email no puede exceder los 75 caracteres")
    private String email;

    /** * Sin @NotBlank para permitir que sea null o vacío.
     * Si el usuario decide cambiarla, debe cumplir con el tamaño mínimo.
     */
    @Size(min = 8, max = 30, message = "La nueva contraseña debe tener entre 8 y 30 caracteres")
    private String password;

    @NotNull(message = "El rol es obligatorio")
    @Positive(message = "ID de rol no válido")
    private Integer idRol;
}
