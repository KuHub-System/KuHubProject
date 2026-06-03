package KuHub.modules.gestion_inventario.dtos.response.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class MotionCreateDTO {

    @NotNull(message = "El ID del inventario es obligatorio")
    private Integer idInventario;

    @NotNull(message = "La cantidad del movimiento es obligatoria")
    // Cambiamos a DecimalMin para manejar la precisión de BigDecimal correctamente
    @DecimalMin(value = "0.001", message = "El movimiento debe ser mayor a 0")
    @Digits(integer = 7, fraction = 3, message = "El movimiento debe tener máximo 7 enteros y 3 decimales")
    private BigDecimal stockMovimiento;

    @NotBlank(message = "El tipo de movimiento es obligatorio")
    private String tipoMovimiento;

    @Size(max = 150, message = "La observación no puede exceder los 150 caracteres")
    private String observacion;

    private Integer idSolicitud;

    private Integer idPedido;

    private Integer idOrdenPedido;
}
