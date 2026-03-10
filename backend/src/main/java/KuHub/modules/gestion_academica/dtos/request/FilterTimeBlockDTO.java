package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FilterTimeBlockDTO {
    @NotNull(message = "El ID de la sala es obligatorio")
    private Integer idSala;
    @NotBlank(message = "El día de la semana no puede estar vacío")
    private String diaSemana;
}
