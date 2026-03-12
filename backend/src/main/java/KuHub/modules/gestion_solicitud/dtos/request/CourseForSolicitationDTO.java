package KuHub.modules.gestion_solicitud.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseForSolicitationDTO {
    private Integer idAsignatura;
    private String nombreAsignatura;

    // Aquí entra la lista de secciones generada por el JSON de la BD
    private List<SectionForSolicitationDTO> secciones;
}
