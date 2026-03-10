package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseCreateDTO {

    @NotBlank(message = "El código de asignatura no puede estar vacío")
    @Size(max = 50, message = "El código no puede superar los 50 caracteres")
    private String codAsignatura;

    @NotBlank(message = "El nombre de la asignatura no puede estar vacío")
    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
    private String nombreAsignatura;

    @NotNull(message = "Debe asignar un profesor gestor a la asignatura")
    private Integer idUsuarioGestorAsignatura;

    @Size(max = 250, message = "La descripción no puede superar los 250 caracteres")
    private String descripcionAsignatura;
}
