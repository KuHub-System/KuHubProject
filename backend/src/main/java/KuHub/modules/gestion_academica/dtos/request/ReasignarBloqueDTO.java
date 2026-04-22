package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ReasignarBloqueDTO {

    /** ID del bloque existente a actualizar. Null si es un bloque nuevo. */
    private Integer idBloque;

    @NotNull(message = "El numero de bloque es obligatorio")
    private Integer numeroBloque;

    @NotBlank(message = "La hora de inicio es obligatoria")
    private String horaInicio; // HH:mm:ss

    @NotBlank(message = "La hora de fin es obligatoria")
    private String horaFin; // HH:mm:ss
}
