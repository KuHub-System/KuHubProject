package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CourseUpdateDTO extends CourseCreateDTO{
    @NotNull(message = "El ID de la asignatura es obligatorio para la actualización")
    private Integer idAsignatura;
}
