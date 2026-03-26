package KuHub.modules.gestion_usuario.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para crear o actualizar un permiso (Rol × Módulo).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermisoRolRequestDTO {

    @NotNull(message = "El id del rol es obligatorio")
    private Integer idRol;

    @NotNull(message = "El id del módulo es obligatorio")
    private Integer idModulo;

    @NotNull
    private Boolean puedeLeer = false;

    @NotNull
    private Boolean puedeCrear = false;

    @NotNull
    private Boolean puedeActualizar = false;

    @NotNull
    private Boolean puedeEliminar = false;
}
