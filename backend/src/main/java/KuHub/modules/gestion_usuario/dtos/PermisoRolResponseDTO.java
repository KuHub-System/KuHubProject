package KuHub.modules.gestion_usuario.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de respuesta para un permiso individual (Rol × Módulo).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermisoRolResponseDTO {

    private Long    idPermisoRol;
    private Integer idRol;
    private String  nombreRol;
    private Integer idModulo;
    private String  codigoModulo;
    private String  nombreModulo;
    private Boolean puedeLeer;
    private Boolean puedeCrear;
    private Boolean puedeActualizar;
    private Boolean puedeEliminar;
    private Boolean enabled;
}
