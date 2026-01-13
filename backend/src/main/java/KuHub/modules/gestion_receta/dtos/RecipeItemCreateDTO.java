package KuHub.modules.gestion_receta.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class RecipeItemCreateDTO {
    @NotNull
    private Integer idProducto;

    @NotNull
    @Positive(message = "La cantidad debe ser mayor a cero")
    private Double cantUnidadMedida;
}