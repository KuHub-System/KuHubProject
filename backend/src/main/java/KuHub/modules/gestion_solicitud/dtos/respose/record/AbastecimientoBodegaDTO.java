package KuHub.modules.gestion_solicitud.dtos.respose.record;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO de respuesta para Abastecimiento de Bodega.
 * Agrupa solicitudes EN_PEDIDO con sus productos de categorías INVENTARIO,
 * incluyendo cantidadEnviadaBodega (suma real de movimientos TRASLADO) para rastrear cuánto se
 * envió a bodega de tránsito por cada solicitud/producto.
 * ✅ En uso: Consumido por obtenerAbastecimientoBodegaService en solicitud-service.ts.
 */
@JsonPropertyOrder({"solicitudes"})
public record AbastecimientoBodegaDTO(
        @JsonProperty("solicitudes")
        List<SolicitudBodegaItem> solicitudes
) {

    @JsonPropertyOrder({
            "idSolicitud", "fechaSolicitada", "nombreSeccion",
            "nombreAsignatura", "diaSemana", "horaInicio", "horaFin", "detalles"
    })
    public record SolicitudBodegaItem(
            @JsonProperty("idSolicitud")       Integer idSolicitud,
            @JsonProperty("fechaSolicitada")   LocalDate fechaSolicitada,
            @JsonProperty("nombreSeccion")     String nombreSeccion,
            @JsonProperty("nombreAsignatura")  String nombreAsignatura,
            @JsonProperty("diaSemana")         String diaSemana,
            @JsonProperty("horaInicio")        String horaInicio,
            @JsonProperty("horaFin")           String horaFin,
            @JsonProperty("detalles")          List<DetalleBodegaItem> detalles
    ) {}

    @JsonPropertyOrder({
            "idDetalleSolicitud", "idProducto", "nombreProducto",
            "abreviatura", "esFraccionario", "cantidadSolicitada",
            "idInventario", "stock", "stockBodegaTransito", "cantidadEnviadaBodega"
    })
    public record DetalleBodegaItem(
            @JsonProperty("idDetalleSolicitud")     Integer idDetalleSolicitud,
            @JsonProperty("idProducto")             Integer idProducto,
            @JsonProperty("nombreProducto")         String nombreProducto,
            @JsonProperty("abreviatura")            String abreviatura,
            @JsonProperty("esFraccionario")         Boolean esFraccionario,
            @JsonProperty("cantidadSolicitada")     BigDecimal cantidadSolicitada,
            @JsonProperty("idInventario")           Integer idInventario,
            @JsonProperty("stock")                  BigDecimal stock,
            /** Stock físico actual del producto en bodega de tránsito. Es el mismo valor en todos
             *  los detalles del mismo producto: el front lo reparte entre solicitudes por orden
             *  cronológico para determinar cuáles ya están cubiertas y no necesitan traslado. */
            @JsonProperty("stockBodegaTransito")    BigDecimal stockBodegaTransito,
            /** Suma real de movimiento.stock_movimiento (tipo_movimiento = TRASLADO) para esta
             *  solicitud y producto puntual. Reemplaza al viejo boolean enviadoBodegaTransito:
             *  distingue envío parcial de envío completo sin depender de un flag aparte. */
            @JsonProperty("cantidadEnviadaBodega")  BigDecimal cantidadEnviadaBodega
    ) {}
}
