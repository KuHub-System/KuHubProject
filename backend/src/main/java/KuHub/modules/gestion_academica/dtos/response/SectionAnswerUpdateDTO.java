package KuHub.modules.gestion_academica.dtos.response;


import KuHub.modules.gestion_academica.entity.Seccion;
import lombok.*;

import java.util.List;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class SectionAnswerUpdateDTO {
    private Integer idSeccion;
    private Integer idAsignatura;
    private String nombreSeccion;
    private Seccion.EstadoSeccion estadoSeccion;
    private Integer idDocente;
    private String nombreCompletoDocente;
    private Integer capacidadMaxInscritos;
    private Integer cantInscritos;
    private List<SectionBlockDTO> bloquesHorarios;
}
