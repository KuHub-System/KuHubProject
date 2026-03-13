package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleSolicitationDTO {
    @NotNull(message = "El idReservaSala es obligatorio")
    private Integer idReservaSala;

    @NotNull(message = "La fecha solicitada calculada es obligatoria")
    private LocalDate fechaSolicitadaCalculada;
}
