package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NewProductSolicitationDTO {
    @NotNull(message = "El idProducto es obligatorio para productos nuevos")
    private Integer idProducto;

    @NotNull(message = "La cantidad del nuevo producto es obligatoria")
    private BigDecimal cantProducto;
}
