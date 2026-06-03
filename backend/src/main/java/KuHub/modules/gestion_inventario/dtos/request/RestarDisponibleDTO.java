package KuHub.modules.gestion_inventario.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Solicita descontar una cantidad del stock disponible de un producto (sobrantes
 * registrados en bodega de tránsito). Se usa al registrar una salida/merma/devolución.
 * Incluye el disponible que el usuario veía en pantalla para detectar cambios por
 * procesos en paralelo (patrón de sincronización igual al de inventario).
 */
public record RestarDisponibleDTO(
        @NotNull(message = "El ID del producto es obligatorio")
        @JsonProperty("idProducto") Integer idProducto,

        @NotNull(message = "La cantidad es obligatoria")
        @DecimalMin(value = "0", message = "La cantidad no puede ser negativa")
        @JsonProperty("cantidad") BigDecimal cantidad,

        // Disponible que el usuario tenía en pantalla; si difiere del real se avisa.
        @JsonProperty("disponibleEnVista") BigDecimal disponibleEnVista,

        // 'BODEGA_TRANSITO' o 'INVENTARIO' (default si viene null).
        @JsonProperty("tipoDisponible") String tipoDisponible
) {}
