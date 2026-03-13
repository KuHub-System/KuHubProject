package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SolicitationStatusItemDTO {

    @NotNull(message = "El idSolicitud es obligatorio")
    private Integer idSolicitud;

    @NotBlank(message = "El estado es obligatorio")
    private String estado;
}
