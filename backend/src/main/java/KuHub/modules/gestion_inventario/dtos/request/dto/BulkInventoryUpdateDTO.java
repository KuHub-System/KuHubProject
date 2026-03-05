package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BulkInventoryUpdateDTO {
    @NotNull
    private Integer idInventario;

    @NotNull
    private BigDecimal stock;

    @NotNull
    private String tipoMovimiento;
}
