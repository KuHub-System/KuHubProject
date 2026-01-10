package KuHub.modules.gestion_solicitud.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SectionsForSolicitationRequestDTO {

    @NotNull(message = "El ID de la sección es obligatorio")
    private Integer idSeccion;

    @NotNull(message = "La fecha calculada de la solicitud es obligatoria")
    private LocalDate fechaCalculadaSolicitud;// Spring convertirá automáticamente "YYYY-MM-DD" a LocalDate
}
