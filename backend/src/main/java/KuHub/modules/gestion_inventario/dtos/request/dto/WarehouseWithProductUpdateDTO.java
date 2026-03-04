package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * DTO para la actualización de stock y datos de producto en Bodega de Tránsito.
 * Hereda las validaciones base de creación de inventario.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class WarehouseWithProductUpdateDTO extends InventoryWithProductCreateDTO{
    @NotNull(message = "El id de la bodega de tránsito es obligatorio")
    private Integer idBodegaTransito;

    @NotNull(message = "El id del inventario es obligatorio")
    private Integer idInventario;

    @NotNull(message = "El id del producto es obligatorio")
    private Integer idProducto;

    @NotNull(message = "El tipo de movimiento es obligatorio")
    private String tipoMovimiento;
}
