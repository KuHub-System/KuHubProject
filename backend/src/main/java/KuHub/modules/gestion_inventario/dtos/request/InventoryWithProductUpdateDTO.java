package KuHub.modules.gestion_inventario.dtos.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;


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

    @NotNull(message = "El stock en vista es obligatorio")
    private BigDecimal stockEnVista;   // stock que el usuario teniene en pantalla

    @NotNull(message = "El delta es obligatorio")
    @DecimalMin(value = "0.001", message = "El delta debe ser mayor a cero")
    @Digits(integer = 7, fraction = 3)
    private BigDecimal delta;

    private Boolean ajustePositivo;         // solo requerido cuando tipo es AJUSTE_INVENTARIO

}
