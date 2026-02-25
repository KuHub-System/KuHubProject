package KuHub.modules.gestion_inventario.dtos;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryWithProductCreateDTO {

    @NotBlank(message = "El nombre del producto es obligatorio")
    @Size(max = 100, message = "El nombre no puede exceder los 100 caracteres")
    private  String nombreProducto;

    @Size(max = 25, message = "El código no puede superar los 25 caracteres")
    private  String codigoProducto;

    @Size(max = 100,message = "La descripcion no puede exceder los 100 caracteres")
    private  String descripcionProducto;

    @NotNull(message = "La id de categoria no puede ser null")
    private  Short idCategoria;

    @NotNull(message = "La id de unidad de medida no puede ser null")
    private  Short idUnidadMedida;

    @NotNull(message = "El stock es obligatorio")
    @DecimalMin(value = "0.0", message = "El stock no puede ser negativo")
    @Digits(integer = 7, fraction = 3, message = "El stock debe tener máximo 7 enteros y 3 decimales")
    private BigDecimal stock;

    @DecimalMin(value = "0.0", message = "El stock límite no puede ser negativo")
    @Digits(integer = 7, fraction = 3, message = "El stock límite debe tener máximo 7 enteros y 3 decimales")
    private BigDecimal stockLimit;
}
