package KuHub.modules.gestion_inventario.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCategoriaDTO {
    @NotBlank(message = "El nombre de la categoria es obligatorio")
    private String nombreCategoria;
}
