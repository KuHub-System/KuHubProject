package KuHub.modules.pedido_semana_a_bodega.dtos.request.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PedidoSemanaBodegaItemDTO {
    @NotNull(message = "El ID del producto es obligatorio")
    @Positive(message = "El ID del producto debe ser un número positivo")
    private Integer idProducto;

    @NotNull(message = "La cantidad es obligatoria")
    @Positive(message = "La cantidad debe ser mayor a cero")
    @Digits(integer = 7, fraction = 3, message = "La cantidad excede el formato permitido (máx. 7 enteros y 3 decimales)")
    private BigDecimal cantUnidadMedida;

    @Size(max = 100, message = "La observación no puede exceder los 100 caracteres")
    private String observacion;
}
