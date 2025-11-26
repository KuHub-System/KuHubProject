package KuHub.modules.gestion_academica.dtos.dtoentity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SeccionEntityResponseDTO {
    private Integer idSeccion;
    private Integer idAsignatura;
    private String nombreSeccion;
    private Integer capacidadMax;
    private Integer cantInscritos;
    private Boolean activo;
    private String estadoSeccion;
}