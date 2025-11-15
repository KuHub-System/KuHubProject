package KuHub.modules.receta.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter@Setter@ToString@AllArgsConstructor@NoArgsConstructor
public class RecipeItemDTO {
    @NotNull
    private Integer idProducto;
    @NotBlank
    private String nombreProducto;
    @NotBlank
    private String unidadMedida;
    @NotNull
    private Double cantUnidadMedida;
}
