package KuHub.modules.inventario.dtos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class MotionAnswerDTO {

    @NotNull(message = "El ID del Movimiento es obligatorio")
    @JsonIgnore
    private Integer idMovimiento;
    @NotBlank(message = "El nombre del producto es obligatorio")
    private String nombreProducto;
    @NotBlank(message = "El nombre de la categoría es obligatorio")
    private String nombreCategoria;;
    @NotNull(message = "El tipo de movimiento es obligatorio")
    private String tipoMovimiento;
    @NotNull(message = "La cantidad (stock) es obligatoria")
    @Positive(message = "El movimiento debe ser mayor a 0")
    private Double stockMovimiento;
    @NotNull(message = "La fecha del movimiento es obligatoria")
    private LocalDateTime fechaMovimiento;
    @NotBlank(message = "El nombre del usuario es obligatorio")
    private String nombreUsuario;
    private String observacion;
}
