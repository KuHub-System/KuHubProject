package KuHub.modules.gestion_receta.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class RecipeItemCreateXDDTO {
    @NotNull
    private Integer idProducto;

    @NotNull
    @Positive(message = "La cantidad debe ser mayor a cero")
    private BigDecimal cantUnidadMedida;
}