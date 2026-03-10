package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookTImeBlocksDTO {
    @NotNull(message = "El ID del bloque es obligatorio")
    private Integer idBloque;

    @NotNull(message = "El número de bloque es obligatorio")
    private Integer numeroBloque;

    // Si usas tipos de tiempo específicos como LocalTime, es aún mejor
    @NotNull(message = "La hora de inicio es obligatoria")
    private String horaInicio;

    @NotNull(message = "La hora de fin es obligatoria")
    private String horaFin;

    @NotBlank(message = "El día de la semana es obligatorio")
    private String diaSemana;

    @NotNull(message = "El ID de la sala es obligatorio")
    private Integer idSala;
}
