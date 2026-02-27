package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
@Data
public class ValidateStockBeforeUpdatingDTO {

        @NotNull(message = "El stock es obligatorio")
        @DecimalMin(value = "0.0", message = "El stock no puede ser negativo")
        @Digits(integer = 7, fraction = 3, message = "El stock debe tener máximo 7 enteros y 3 decimales")
        private BigDecimal validateStock;

        @NotNull(message = "El id del inventario es obligatorio")
        private Integer idInventario;
}
