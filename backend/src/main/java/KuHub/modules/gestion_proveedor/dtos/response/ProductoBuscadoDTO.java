package KuHub.modules.gestion_proveedor.dtos.response;

import java.math.BigDecimal;

/**
 * Record que representa un producto encontrado en la búsqueda global.
 * Incluye información del producto, categoría, unidad y precio del proveedor.
 */
public record ProductoBuscadoDTO(
        Integer idProducto,
        String codProducto,
        String nombreProducto,
        String categoria,
        String unidad,
        BigDecimal precioProducto,
        Boolean activo
) {
    /**
     * Factory method para construir desde un Object[] de consulta nativa.
     * Índices:
     * [0] id_producto
     * [1] cod_producto
     * [2] nombre_producto
     * [3] categoria
     * [4] unidad
     * [5] precio_producto
     * [6] activo (desde proveedor_producto)
     */
    public static ProductoBuscadoDTO fromRow(Object[] row) {
        return new ProductoBuscadoDTO(
                ((Number) row[0]).intValue(),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                (String) row[4],
                new BigDecimal(row[5].toString()),
                (Boolean) row[6]
        );
    }
}
