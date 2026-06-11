package KuHub.modules.gestion_orden_pedido.dtos.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

/**
 * Reserva de stock cubierto para una solicitud, registrada al generar la OP con "cubrir con
 * disponible". Indica cuánto de un producto se cubrió desde el stock existente para esa solicitud.
 */
@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
public class ReservaStockSolicitudCreateDTO {

    @NotNull(message = "El idSolicitud es obligatorio")
    private Integer idSolicitud;

    @NotNull(message = "El idProducto es obligatorio")
    private Integer idProducto;

    @NotNull(message = "La cantidad es obligatoria")
    @DecimalMin(value = "0.001", message = "La cantidad debe ser mayor a 0")
    @Digits(integer = 7, fraction = 3, message = "Máximo 7 enteros y 3 decimales")
    private BigDecimal cantidad;
}
