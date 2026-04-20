package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FilterBlocksByTeacherDTO {
    @NotNull(message = "El ID del usuario es obligatorio")
    private Integer idUsuario;
    @NotBlank(message = "El día de la semana no puede estar vacío")
    private String diaSemana;
}
