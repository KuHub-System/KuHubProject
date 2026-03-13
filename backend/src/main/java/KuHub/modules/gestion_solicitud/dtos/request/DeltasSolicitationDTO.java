package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeltasSolicitationDTO {
    private List<Integer> eliminados;

    @Valid
    private List<ModifiedDetailSolicitationDTO> modificados;

    @Valid
    private List<NewProductSolicitationDTO> nuevos;
}
