package KuHub.modules.gestion_inventario.dtos.response.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class MotionAnswerDTO {
    @NotBlank(message = "El nombre del producto es obligatorio")
    private String nombreProducto;

    @NotBlank(message = "El nombre de la categoría es obligatorio")
    private String nombreCategoria;

    @NotBlank(message = "El tipo de movimiento es obligatorio")
    private String tipoMovimiento;

    @NotNull(message = "La cantidad es obligatoria")
    @Positive(message = "El movimiento debe ser mayor a 0")
    private BigDecimal stockMovimiento;

    @NotNull(message = "La fecha es obligatoria")
    @PastOrPresent(message = "La fecha no puede ser futura")
    private LocalDateTime fechaMovimiento;

    @NotBlank(message = "El nombre del usuario es obligatorio")
    private String nombreUsuario;

    private String observacion;

    private Integer idSolicitud;

    private Integer idPedido;

    private Integer idOrdenPedido;
}
