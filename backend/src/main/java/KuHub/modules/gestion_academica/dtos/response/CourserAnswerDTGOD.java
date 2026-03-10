package KuHub.modules.gestion_academica.dtos.response;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourserAnswerDTGOD {
    private Integer idAsignatura;
    private String codAsignatura;
    private String nombreAsignatura;
    private Integer idCompletoProfesor;
    private String nombreProfesor;
    private String descripcionAsignatura;
    private List<SectionAnswerUpdateDTO> secciones;
}
