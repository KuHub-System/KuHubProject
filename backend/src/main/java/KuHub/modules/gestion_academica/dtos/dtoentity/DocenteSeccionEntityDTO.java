package KuHub.modules.gestion_academica.dtos.dtoentity;

import lombok.*;

import java.time.LocalDate;

@Getter@Setter@NoArgsConstructor@AllArgsConstructor@ToString
public class DocenteSeccionEntityDTO {

    private Integer idDocenteSeccion;
    private Integer idSeccion;
    private String nombreSeccion;
    private Integer idDocente;
    private String nombreCompletoDocente;
    private LocalDate fechaAsignacion;
}
