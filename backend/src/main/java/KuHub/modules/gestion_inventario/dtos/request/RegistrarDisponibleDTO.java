package KuHub.modules.gestion_inventario.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RegistrarDisponibleDTO(
        @NotNull(message = "El ID del producto es obligatorio")
        @JsonProperty("idProducto") Integer idProducto,

        @JsonProperty("idSolicitud") Integer idSolicitud,

        @JsonProperty("idPedido") Integer idPedido,

        @NotNull(message = "La cantidad es obligatoria")
        @DecimalMin(value = "0", message = "La cantidad no puede ser negativa")
        @JsonProperty("cantidad") BigDecimal cantidad,

        // Opcional: 'INVENTARIO' (default si viene null) o 'BODEGA_TRANSITO'.
        @JsonProperty("tipoDisponible") String tipoDisponible
) {}
