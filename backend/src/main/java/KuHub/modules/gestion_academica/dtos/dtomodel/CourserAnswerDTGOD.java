package KuHub.modules.gestion_academica.dtos.dtomodel;

import jakarta.persistence.Column;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class CourserAnswerDTGOD {
    @NotNull
    private Integer idAsignatura;
    @NotEmpty
    @Column( length = 50)
    private String codAsignatura;
    @NotEmpty
    @Column( length = 100)
    private String nombreAsignatura;
    @NotNull
    private Integer idCompletoProfesor;
    @NotEmpty
    private String nombreProfesor;
    private String descripcionAsignatura;
    private List<SectionAnswerUpdateDTO> secciones;
}
