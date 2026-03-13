package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangeSolicitationStatusDTO {
    @Valid
    @NotEmpty(message = "La lista de solicitudes no puede estar vacía")
    private List<SolicitationStatusItemDTO> estadosSolicitudes;
}
