package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryWithProductUpdateDTO extends InventoryWithProductCreateDTO {

    @NotNull(message = "El id del inventario es obligatorio")
    private Integer idInventario;

    @NotNull(message = "El id del producto es obligatorio")
    private Integer idProducto;

    @NotNull(message = "El tipo de movimiento es obligatorio")
    private String tipoMovimiento;
}
