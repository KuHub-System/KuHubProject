package KuHub.modules.gestion_inventario.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeStatusActiveUnidadDTO {
    @NotNull(message = "El idUnidadMedida es obligatorio")
    private Short idUnidadMedida;
    @NotNull(message = "El estado es obligatorio")
    private Boolean enable;
}
