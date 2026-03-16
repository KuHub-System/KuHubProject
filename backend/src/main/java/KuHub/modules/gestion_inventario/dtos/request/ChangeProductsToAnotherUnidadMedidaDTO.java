package KuHub.modules.gestion_inventario.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeProductsToAnotherUnidadMedidaDTO {
    @NotNull(message = "La id de la unidad de medida origen no puede ser null")
    private Short oldIdUnidadMedida;
    @NotNull(message = "La id de la unidad de medida destino no puede ser null")
    private Short newIdUnidadMedida;
}
