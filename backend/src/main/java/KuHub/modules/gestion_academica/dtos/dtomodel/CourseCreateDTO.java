package KuHub.modules.gestion_academica.dtos.dtomodel;

import jakarta.persistence.Column;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter@Setter@NoArgsConstructor@AllArgsConstructor@ToString
public class CourseCreateDTO {

    @NotEmpty
    @Column( length = 50)
    private String codAsignatura;
    @NotEmpty
    @Column( length = 100)
    private String nombreAsignatura;
    @NotNull
    private Integer idProfesor;
    @NotEmpty
    private String nombreProfesor;
    private String descripcionAsignatura;
}
