package KuHub.modules.gestion_academica.dtos.dtomodel;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseSolicitationResponseDTO {
    private Integer idAsignatura;
    private String nombreAsignatura;
    private List<SeccionSolicitationDTO> secciones;
}
