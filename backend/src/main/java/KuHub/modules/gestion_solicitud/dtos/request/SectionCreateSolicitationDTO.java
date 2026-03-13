package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SectionCreateSolicitationDTO {
    @NotNull(message = "El idSeccion es obligatorio")
    private Integer idSeccion;

    @NotNull(message = "El idUsuario docente es obligatorio")
    private Integer idUsuario;

    @NotNull(message = "La cantidad de inscritos es obligatoria")
    private Integer cantInscritos;

    @Valid
    @NotEmpty(message = "Debe incluir al menos un horario")
    private List<ScheduleSolicitationDTO> horarios;
}
