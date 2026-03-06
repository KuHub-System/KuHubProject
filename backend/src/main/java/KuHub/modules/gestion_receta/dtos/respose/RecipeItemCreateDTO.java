package KuHub.modules.gestion_receta.dtos.respose;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecipeItemCreateDTO {
    @NotNull(message = "El ID del producto es obligatorio")
    @Positive(message = "El ID del producto debe ser un número positivo")
    private Integer idProducto;

    @NotNull(message = "La cantidad es obligatoria")
    @Positive(message = "La cantidad debe ser mayor a cero")
    @Digits(integer = 7, fraction = 3, message = "La cantidad excede el formato permitido (máx. 7 enteros y 3 decimales)")
    private BigDecimal cantUnidadMedida;
}
