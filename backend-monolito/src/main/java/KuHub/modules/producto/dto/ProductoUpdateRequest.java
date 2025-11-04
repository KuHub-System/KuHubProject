package KuHub.modules.producto.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ProductoUpdateRequest {
    @NotBlank(message = "El nuevo nombre del producto no puede estar vacío")
    private String nombreProductoNuevo;
    @NotBlank(message = "La nueva unidad de medida del producto no puede estar vacío")
    private String unidadMedida;
}
