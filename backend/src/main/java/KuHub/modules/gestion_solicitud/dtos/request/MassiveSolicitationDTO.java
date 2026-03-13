package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MassiveSolicitationDTO {
    @NotNull(message = "El idAsignatura es obligatorio")
    private Integer idAsignatura;

    @NotNull(message = "El idSemana es obligatorio")
    private Integer idSemana;//obligatorio

    private Integer idReceta;

    @Size(max = 600, message = "La observación no puede superar los 600 caracteres")
    private String observacion;

    @Valid
    @NotEmpty(message = "Debe enviar al menos una sección")
    private List<SectionCreateSolicitationDTO> secciones;

    @Valid
    private DeltasSolicitationDTO deltas;
}
