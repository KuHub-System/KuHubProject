package KuHub.modules.gestion_orden_pedido.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
public class OrdenPedidoCreateDTO {

    @NotNull(message = "El idPedido es obligatorio")
    private Integer idPedido;

    @NotNull(message = "El idProveedor es obligatorio")
    private Integer idProveedor;

    private String observaciones;

    @NotEmpty(message = "Debe incluir al menos una entrega con cantidad > 0")
    @Valid
    private List<EntregaDTO> entregas;

    @Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
    public static class EntregaDTO {

        @NotNull(message = "El idProducto es obligatorio")
        private Integer idProducto;

        @NotNull(message = "La cantidad es obligatoria")
        @DecimalMin(value = "0.001", message = "La cantidad debe ser mayor a 0")
        @Digits(integer = 7, fraction = 3, message = "Máximo 7 enteros y 3 decimales")
        private BigDecimal cantidad;

        @NotNull(message = "La fecha de entrega es obligatoria")
        private LocalDate fechaEntrega;

        /**
         * Solicitudes que abastece esta línea y cuánto aporta cada una (puente de trazabilidad).
         * Opcional: si viene vacía no se persisten vínculos. La diferencia entre {@code cantidad}
         * y la suma de las atribuidas es el ajuste manual (±) sin dueño.
         */
        @Valid
        private List<SolicitudAtribuidaDTO> solicitudes;
    }

    @Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
    public static class SolicitudAtribuidaDTO {

        @NotNull(message = "El idSolicitud es obligatorio")
        private Integer idSolicitud;

        @NotNull(message = "La cantidad atribuida es obligatoria")
        @DecimalMin(value = "0.001", message = "La cantidad atribuida debe ser mayor a 0")
        @Digits(integer = 7, fraction = 3, message = "Máximo 7 enteros y 3 decimales")
        private BigDecimal cantidadAtribuida;
    }
}
