package KuHub.modules.gestion_inventario.dtos.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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

    private String tipoMovimiento;          // null si solo se actualiza metadata / stockLimit

    @DecimalMin(value = "0.0", message = "El delta no puede ser negativo")
    @Digits(integer = 7, fraction = 3)
    private BigDecimal delta;               // null si no hay movimiento de stock

    @NotNull(message = "El stock en vista es obligatorio para control de sincronización")
    private BigDecimal stockEnVista;
}
