package KuHub.modules.gestion_inventario.dtos.request.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidateTransitStockDTO {
    @NotNull(message = "El id de la bodega de tránsito es obligatorio")
    private Integer idBodegaTransito;

    @NotNull(message = "El stock a validar es obligatorio")
    private BigDecimal validateStock;
}