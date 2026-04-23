package KuHub.modules.gestion_pedido.dtos.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Resumen histórico de pedidos con detalles de productos consumidos.
 * Estructura basada en consulta JSONB nativa con agregaciones por rango de fechas y estados.
 */
@JsonPropertyOrder({"fechaInicio", "fechaFin", "estados", "totalProductosDistintos", "totalPedidos", "productos"})
public record ResumenHistoricoResponse(
        LocalDate fechaInicio,
        LocalDate fechaFin,
        List<String> estados,
        Integer totalProductosDistintos,
        Integer totalPedidos,
        List<ProductoResumenItem> productos
) {
    /**
     * Detalle de cada producto en el resumen.
     */
    @JsonPropertyOrder({"idProducto", "codProducto", "nombreProducto", "unidadMedida", "abreviatura", "cantidadTotal", "vecesEnPedidos"})
    public record ProductoResumenItem(
            Integer idProducto,
            String codProducto,
            String nombreProducto,
            String unidadMedida,
            String abreviatura,
            BigDecimal cantidadTotal,
            Integer vecesEnPedidos
    ) {
        /**
         * Factory para convertir desde Object[] de consulta nativa.
         * Índices esperados:
         * [0] id_producto (Integer)
         * [1] cod_producto (String)
         * [2] nombre_producto (String)
         * [3] nombre_unidad (String)
         * [4] abreviatura (String)
         * [5] cantidad_total (BigDecimal)
         * [6] veces_en_pedidos (Integer)
         */
        public static ProductoResumenItem fromRow(Object[] row) {
            return new ProductoResumenItem(
                    ((Number) row[0]).intValue(),
                    (String) row[1],
                    (String) row[2],
                    (String) row[3],
                    (String) row[4],
                    new BigDecimal(row[5].toString()),
                    ((Number) row[6]).intValue()
            );
        }
    }

    /**
     * Factory para construir desde lista de Object[] (productos) y parámetros.
     */
    public static ResumenHistoricoResponse of(
            LocalDate fechaInicio,
            LocalDate fechaFin,
            List<String> estados,
            Integer totalProductosDistintos,
            Integer totalPedidos,
            List<Object[]> productosRows) {
        List<ProductoResumenItem> productos = productosRows.stream()
                .map(ProductoResumenItem::fromRow)
                .toList();
        return new ResumenHistoricoResponse(fechaInicio, fechaFin, estados, totalProductosDistintos, totalPedidos, productos);
    }
}
