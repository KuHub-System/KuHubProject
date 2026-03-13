package KuHub.modules.gestion_solicitud.dtos.respose;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CourseDetailsDTO {
    @JsonProperty("id_asignatura")
    private Integer idAsignatura;

    @JsonProperty("nombre_asignatura")
    private String nombreAsignatura;

    // La sección anidada
    @JsonProperty("seccion")
    private SectionDetailsDTO seccion;
}
