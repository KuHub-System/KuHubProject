package KuHub.modules.gestion_pedido.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * =====================================================
 * RECORDS MAESTROS PARA DASHBOARD DE PEDIDOS
 * =====================================================
 *
 * Estructura jerárquica:
 *
 * PedidoCompletoJson (Consulta 1 - findPedidoConDetallesJson)
 * ├── ProductoPedidoJson
 * │   └── DetalleSolicitudProductoJson
 * └── SolicitudVinculadaJson
 *     ├── SeccionResumenJson
 *     ├── ProductoSolicitadoJson
 *     └── HorarioJson
 *
 * PedidoResumenListaJson (Consulta 2 - findPedidosPorRangoJson)
 *   └── (mismos sub-records que Consulta 1)
 *
 * PedidoAprobacionJson (Consulta 3 - findPedidoResumenAprobacionJson)
 *   └── ProductoAprobacionJson
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class PedidoDashboardRecords {

    // =====================================================
    // RECORD MAESTRO - CONSULTA 1: Pedido completo con detalles
    // =====================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PedidoCompletoJson(
            @JsonProperty("idPedido") Integer idPedido,
            @JsonProperty("fechaInicioPedido") LocalDate fechaInicioPedido,
            @JsonProperty("fechaFinPedido") LocalDate fechaFinPedido,
            @JsonProperty("fechaRegistro") LocalDateTime fechaRegistro,
            @JsonProperty("estadoPedido") String estadoPedido,
            @JsonProperty("totalSolicitudes") Integer totalSolicitudes,
            @JsonProperty("totalProductos") Integer totalProductos,
            @JsonProperty("productos") List<ProductoPedidoJson> productos,
            @JsonProperty("solicitudesVinculadas") List<SolicitudVinculadaJson> solicitudesVinculadas
    ) {}

    // =====================================================
    // RECORD MAESTRO - CONSULTA 2: Lista de pedidos por rango
    // =====================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PedidoResumenListaJson(
            @JsonProperty("idPedido") Integer idPedido,
            @JsonProperty("fechaInicioPedido") LocalDate fechaInicioPedido,
            @JsonProperty("fechaFinPedido") LocalDate fechaFinPedido,
            @JsonProperty("fechaRegistro") LocalDateTime fechaRegistro,
            @JsonProperty("estadoPedido") String estadoPedido,
            @JsonProperty("totalSolicitudes") Integer totalSolicitudes,
            @JsonProperty("totalProductosDistintos") Integer totalProductosDistintos,
            @JsonProperty("productosConsolidados") List<ProductoConsolidadoJson> productosConsolidados
    ) {}

    // =====================================================
    // RECORD MAESTRO - CONSULTA 3: Resumen para aprobación
    // =====================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PedidoAprobacionJson(
            @JsonProperty("idPedido") Integer idPedido,
            @JsonProperty("estadoPedido") String estadoPedido,
            @JsonProperty("fechaInicioPedido") LocalDate fechaInicioPedido,
            @JsonProperty("fechaFinPedido") LocalDate fechaFinPedido,
            @JsonProperty("productos") List<ProductoAprobacionJson> productos
    ) {}

    // =====================================================
    // SUB-RECORDS COMPARTIDOS
    // =====================================================

    /**
     * Producto consolidado del pedido con desglose por solicitud.
     * Usado en Consulta 1 (productos del pedido completo).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoPedidoJson(
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantidadTotalPedido") BigDecimal cantidadTotalPedido,
            @JsonProperty("unidad") String unidad,
            @JsonProperty("abreviatura") String abreviatura,
            @JsonProperty("totalSecciones") Integer totalSecciones,
            @JsonProperty("detallesPorSolicitud") List<DetalleSolicitudProductoJson> detallesPorSolicitud
    ) {}

    /**
     * Producto consolidado con desglose (vista lista).
     * Usado en Consulta 2 (lista de pedidos por rango).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoConsolidadoJson(
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantidadTotal") BigDecimal cantidadTotal,
            @JsonProperty("unidad") String unidad,
            @JsonProperty("abreviatura") String abreviatura,
            @JsonProperty("totalSecciones") Integer totalSecciones,
            @JsonProperty("detalles") List<DetalleSolicitudProductoJson> detalles
    ) {}

    /**
     * Detalle de una solicitud específica para un producto.
     * Compartido entre Consulta 1 y 2.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetalleSolicitudProductoJson(
            @JsonProperty("idSolicitud") Integer idSolicitud,
            @JsonProperty("fechaSolicitada") LocalDate fechaSolicitada,
            @JsonProperty("nombreSeccion") String nombreSeccion,
            @JsonProperty("nombreAsignatura") String nombreAsignatura,
            @JsonProperty("nombreDocente") String nombreDocente,
            @JsonProperty("cantidad") BigDecimal cantidad,
            @JsonProperty("unidadAbreviada") String unidadAbreviada,
            @JsonProperty("observacion") String observacion,
            @JsonProperty("alumnos") Integer alumnos,
            @JsonProperty("nombreReceta") String nombreReceta,
            @JsonProperty("nombreSala") String nombreSala,
            @JsonProperty("rangoHoras") String rangoHoras
    ) {}

    /**
     * Solicitud vinculada con toda su info (cronograma).
     * Usado en Consulta 1.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SolicitudVinculadaJson(
            @JsonProperty("idSolicitud") Integer idSolicitud,
            @JsonProperty("fechaSolicitada") LocalDate fechaSolicitada,
            @JsonProperty("estadoSolicitud") String estadoSolicitud,
            @JsonProperty("nombreReceta") String nombreReceta,
            @JsonProperty("observaciones") String observaciones,
            @JsonProperty("seccion") SeccionResumenJson seccion,
            @JsonProperty("cantProductos") Integer cantProductos,
            @JsonProperty("productosSolicitados") List<ProductoSolicitadoJson> productosSolicitados,
            @JsonProperty("horarios") HorarioJson horarios
    ) {}

    /**
     * Resumen de sección (dentro de solicitud vinculada).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SeccionResumenJson(
            @JsonProperty("idSeccion") Integer idSeccion,
            @JsonProperty("nombreSeccion") String nombreSeccion,
            @JsonProperty("nombreAsignatura") String nombreAsignatura,
            @JsonProperty("nombreDocente") String nombreDocente,
            @JsonProperty("cantInscritos") Integer cantInscritos
    ) {}

    /**
     * Producto solicitado (lista simple dentro de solicitud vinculada).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoSolicitadoJson(
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantidad") BigDecimal cantidad,
            @JsonProperty("unidadAbreviada") String unidadAbreviada,
            @JsonProperty("observacion") String observacion
    ) {}

    /**
     * Horario con sala y rango de horas.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HorarioJson(
            @JsonProperty("nombreSala") String nombreSala,
            @JsonProperty("rangoHoras") String rangoHoras
    ) {}

    /**
     * Producto con info de stock para pantalla de aprobación.
     * Usado en Consulta 3.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoAprobacionJson(
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantidadPedido") BigDecimal cantidadPedido,
            @JsonProperty("unidad") String unidad,
            @JsonProperty("abreviatura") String abreviatura,
            @JsonProperty("categoria") String categoria,
            @JsonProperty("stockBodegaTransito") BigDecimal stockBodegaTransito,
            @JsonProperty("stockInventarioPrincipal") BigDecimal stockInventarioPrincipal,
            @JsonProperty("diferenciaTransito") BigDecimal diferenciaTransito,
            @JsonProperty("totalSecciones") Integer totalSecciones
    ) {}

    public record PedidoDashboardResponse(
            List<PedidoCompletoJson> pedidosCompletos,
            List<PedidoResumenListaJson> pedidosResumen,
            List<PedidoAprobacionJson> pedidosAprobacion
    ) {}

    // =====================================================
    // RECORDS PARA CONSULTA 4: Entregas Diarias (Bodega)
    // findEntregasDiariasJson → organizado por fecha → sala → horario
    // Incluye stockTransito y diferencia por producto
    // =====================================================

    /**
     * Producto individual con stock de bodega de tránsito y diferencia.
     * Exclusivo de CONSULTA 4 (findEntregasDiariasJson).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoEntregaBodegaJson(
            @JsonProperty("idProducto")      Integer    idProducto,
            @JsonProperty("nombreProducto")  String     nombreProducto,
            @JsonProperty("cantidad")        BigDecimal cantidad,
            @JsonProperty("unidadAbreviada") String     unidadAbreviada,
            @JsonProperty("observacion")     String     observacion,
            @JsonProperty("stockTransito")   BigDecimal stockTransito,
            @JsonProperty("diferencia")      BigDecimal diferencia
    ) {}

    /**
     * Solicitud ACEPTADA vinculada a un pedido APROVADO,
     * con horario y lista de productos con info de stock.
     * Exclusivo de CONSULTA 4.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SolicitudEntregaBodegaJson(
            @JsonProperty("idSolicitud")      Integer    idSolicitud,
            @JsonProperty("horaInicio")       String     horaInicio,
            @JsonProperty("rangoHoras")       String     rangoHoras,
            @JsonProperty("nombreSeccion")    String     nombreSeccion,
            @JsonProperty("nombreAsignatura") String     nombreAsignatura,
            @JsonProperty("nombreDocente")    String     nombreDocente,
            @JsonProperty("cantInscritos")    Integer    cantInscritos,
            @JsonProperty("nombreReceta")     String     nombreReceta,
            @JsonProperty("observaciones")    String     observaciones,
            @JsonProperty("productos")        List<ProductoEntregaBodegaJson> productos
    ) {}

    /**
     * Sala con sus solicitudes para un día específico.
     * Exclusivo de CONSULTA 4.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SalaEntregaBodegaJson(
            @JsonProperty("idSala")      Integer idSala,
            @JsonProperty("nombreSala")  String  nombreSala,
            @JsonProperty("codSala")     String  codSala,
            @JsonProperty("solicitudes") List<SolicitudEntregaBodegaJson> solicitudes
    ) {}

    /**
     * Registro maestro de entregas para un día: fecha + salas + stock.
     * Exclusivo de CONSULTA 4 (findEntregasDiariasJson).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EntregaDiariaBodegaJson(
            @JsonProperty("fecha")            LocalDate                fecha,
            @JsonProperty("totalSolicitudes") Integer                  totalSolicitudes,
            @JsonProperty("salas")            List<SalaEntregaBodegaJson> salas
    ) {}
}

