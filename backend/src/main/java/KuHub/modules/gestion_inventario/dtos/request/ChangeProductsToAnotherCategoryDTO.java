package KuHub.modules.gestion_inventario.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeProductsToAnotherCategoryDTO {
    @NotNull(message ="la Id categoria old que es la referencia para modificar no puede ser null ")
    private Short oldIdCategoria;
    @NotNull(message ="la Id categoria new que es la referencia para transferir no puede ser null")
    private Short newIdCategoria;
}
