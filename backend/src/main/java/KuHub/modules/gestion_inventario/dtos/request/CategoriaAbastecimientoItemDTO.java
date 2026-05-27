package KuHub.modules.gestion_inventario.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaAbastecimientoItemDTO {

    @NotNull(message = "El ID de categoría es obligatorio")
    private Short idCategoria;

    @NotNull(message = "El flag inventario es obligatorio")
    private Boolean inventario;

    @NotNull(message = "El flag bodegaTransito es obligatorio")
    private Boolean bodegaTransito;
}
