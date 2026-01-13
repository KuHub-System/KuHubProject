package KuHub.modules.gestion_academica.dtos.dtomodel;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeccionSolicitationDTO {
    private Integer idSeccion;
    private String nombreSeccion;
    private Integer cantInscritos;
}
