package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeStatusActiveCategoriaDTO {
    @NotNull(message = "El idCategoria es obligatorio")
    private Short idCategoria;

    @NotNull(message = "El estado es obligatorio")
    private Boolean enable;
}
