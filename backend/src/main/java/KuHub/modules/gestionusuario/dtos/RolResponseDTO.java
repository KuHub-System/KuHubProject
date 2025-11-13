package KuHub.modules.gestionusuario.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para respuesta de Rol
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolResponseDTO {

    private Integer idRol;
    private String nombreRol;
    private Boolean activo;
}