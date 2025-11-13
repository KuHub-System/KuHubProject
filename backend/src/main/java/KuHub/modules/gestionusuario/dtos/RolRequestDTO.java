package KuHub.modules.gestionusuario.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para crear o actualizar un Rol
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolRequestDTO {

    @NotBlank(message = "El nombre del rol es obligatorio")
    @Size(min = 3, max = 100, message = "El nombre del rol debe tener entre 3 y 100 caracteres")
    private String nombreRol;

    private Boolean activo = true;
}