package KuHub.modules.gestion_solicitud.dtos.respose.record;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO de respuesta para Abastecimiento de Bodega.
 * Agrupa solicitudes EN_PEDIDO con sus productos de categorías INVENTARIO,
 * incluyendo el boolean enviadoBodegaTransito para rastrear qué fue enviado.
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
            "idInventario", "stock", "enviadoBodegaTransito"
    })
    public record DetalleBodegaItem(
            @JsonProperty("idDetalleSolicitud")    Integer idDetalleSolicitud,
            @JsonProperty("idProducto")            Integer idProducto,
            @JsonProperty("nombreProducto")        String nombreProducto,
            @JsonProperty("abreviatura")           String abreviatura,
            @JsonProperty("esFraccionario")        Boolean esFraccionario,
            @JsonProperty("cantidadSolicitada")    BigDecimal cantidadSolicitada,
            @JsonProperty("idInventario")          Integer idInventario,
            @JsonProperty("stock")                 BigDecimal stock,
            @JsonProperty("enviadoBodegaTransito") Boolean enviadoBodegaTransito
    ) {}
}
