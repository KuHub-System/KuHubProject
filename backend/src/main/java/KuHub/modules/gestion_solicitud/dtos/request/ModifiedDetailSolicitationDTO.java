package KuHub.modules.gestion_solicitud.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModifiedDetailSolicitationDTO {
    @NotNull(message = "El idDetalleReceta es obligatorio para modificar")
    private Integer idDetalleReceta;

    @NotNull(message = "La cantidad del producto a modificar es obligatoria")
    private BigDecimal cantProducto;
}
