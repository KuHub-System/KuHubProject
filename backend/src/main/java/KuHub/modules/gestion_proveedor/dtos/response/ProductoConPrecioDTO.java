package KuHub.modules.gestion_proveedor.dtos.response;

import java.math.BigDecimal;

/**
 * Record de response que representa un producto asignado a un proveedor,
 * incluyendo el precio específico de esa relación.
 * Usado dentro de ProveedorDetalleDTO agrupado por categoría.
 */
public record ProductoConPrecioDTO(
        Integer idProducto,
        Long idProveedorProducto,
        String nombreProducto,
        String nombreCategoria,
        String nombreUnidad,
        String abreviatura,
        BigDecimal precioProducto,
        Boolean activo,
        String fechaActualizacion
) {
    /**
     * Factory method para construir desde un Object[] de consulta nativa.
     * Índices:
     * [0] id_producto
     * [1] id_proveedor_producto
     * [2] nombre_producto
     * [3] nombre_categoria
     * [4] nombre_unidad
     * [5] abreviatura
     * [6] precio_producto
     * [7] activo
     * [8] fecha_actualizacion
     */
    public static ProductoConPrecioDTO fromRow(Object[] row) {
        return new ProductoConPrecioDTO(
                ((Number) row[0]).intValue(),
                ((Number) row[1]).longValue(),
                (String) row[2],
                (String) row[3],
                (String) row[4],
                (String) row[5],
                new BigDecimal(row[6].toString()),
                (Boolean) row[7],
                row[8] != null ? row[8].toString() : null
        );
    }
}
