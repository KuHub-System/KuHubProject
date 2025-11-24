package KuHub.modules.gestionusuario.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para estadísticas de usuarios
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioEstadisticasDTO {

    private Long totalUsuarios;
    private Long usuariosActivos;
    private Long usuariosInactivos;
    private Long totalRoles;
}