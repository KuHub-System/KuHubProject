package KuHub.modules.gestion_orden_compra.dtos.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

/**
 * =====================================================
 * DTO PARA COTIZACIÓN CONSOLIDADA (Paso 2 — Orden de Compra)
 * =====================================================
 *
 * Cadena de tablas (no usa {@code detalle_pedido}):
 *
 *   pedido (estado_pedido = 'APROBADO', id IN :idsPedido)
 *     └─ pedido_solicitud
 *           └─ solicitud (estado_solicitud = 'EN_PEDIDO')
 *                 ├─ reserva_sala (id_reserva_sala)  →  dia_semana
 *                 └─ detalle_solicitud (cant_producto_solicitud)
 *                       └─ producto → categoria, unidad_medida
 *
 * Cada producto se asigna al proveedor con menor {@code precio_neto} vigente. Cada proveedor
 * lleva su {@code diasEntrega}; cada producto su {@code cantidadPorDia} para que el frontend
 * pueda calcular las fechas reales de entrega contra la semana elegida por el usuario.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class CotizacionConsolidadaDTO {

    /** Registro maestro. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CotizacionConsolidadaResponse(
            @JsonProperty("cotizacion") List<ProveedorGrupo> cotizacion
    ) {}

    /** Proveedor + sus días de entrega + categorías + totales. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProveedorGrupo(
            @JsonProperty("idProveedor") Integer idProveedor,
            @JsonProperty("nombreDistribuidora") String nombreDistribuidora,
            @JsonProperty("nombreProveedor") String nombreProveedor,
            @JsonProperty("telefono") String telefono,
            @JsonProperty("email") String email,
            @JsonProperty("totalProductos") Integer totalProductos,
            @JsonProperty("totalNeto") BigDecimal totalNeto,
            @JsonProperty("totalConIva") BigDecimal totalConIva,
            /** Días en que el proveedor entrega (LUNES..DOMINGO). Null para el bucket "Sin proveedor". */
            @JsonProperty("diasEntrega") List<String> diasEntrega,
            @JsonProperty("categorias") List<CategoriaGrupo> categorias
    ) {}

    /** Categoría dentro de un proveedor con lista de productos. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CategoriaGrupo(
            @JsonProperty("idCategoria") Integer idCategoria,
            @JsonProperty("nombreCategoria") String nombreCategoria,
            @JsonProperty("productos") List<ProductoJson> productos
    ) {}

    /**
     * Producto consolidado del proveedor ganador.
     * - {@code cantidadTotal}: SUM de {@code detalle_solicitud.cant_producto_solicitud} (read-only).
     *   El frontend duplica este valor en una columna editable "Cantidad Requerida".
     * - {@code precioNeto}/{@code precioConIva}: VALORES UNITARIOS (por una unidad), del
     *   {@code proveedor_producto} vigente del proveedor con menor precio neto.
     * - {@code cantidadPorDia}: distribución por día de la semana (a partir de
     *   {@code reserva_sala.dia_semana} de la solicitud que originó cada detalle). Solo
     *   incluye los días que tienen cantidad &gt; 0. Las solicitudes sin {@code id_reserva_sala}
     *   aparecen con día {@code "SIN_DIA"}.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductoJson(
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("abreviatura") String abreviatura,
            @JsonProperty("esFraccionario") Boolean esFraccionario,
            @JsonProperty("cantidadTotal") BigDecimal cantidadTotal,
            @JsonProperty("precioNeto") BigDecimal precioNeto,
            @JsonProperty("precioConIva") BigDecimal precioConIva,
            @JsonProperty("cantidadPorDia") List<CantidadDiaJson> cantidadPorDia
    ) {}

    /** Cantidad solicitada agrupada por día de la semana. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CantidadDiaJson(
            /** "LUNES", "MARTES", ..., "DOMINGO", o "SIN_DIA". */
            @JsonProperty("dia") String dia,
            @JsonProperty("cantidad") BigDecimal cantidad
    ) {}
}
