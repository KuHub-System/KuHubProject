package KuHub.modules.inventario.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class MotionCreateDTO {
    @NotNull(message = "El ID del usuario es obligatorio")
    private Integer idUsuario;

    @NotNull(message = "El ID del inventario es obligatorio")
    private Integer idInventario;

    @NotNull(message = "La cantidad (stock) es obligatoria")
    @Positive(message = "El movimiento debe ser mayor a 0")
    private Double stockMovimiento;

    private Double stockLimitMin;

    @NotNull(message = "El tipo de movimiento es obligatorio")
    private String tipoMovimiento;

    private String observacion;
}
