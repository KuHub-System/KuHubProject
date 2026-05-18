package KuHub.modules.gestion_proveedor.dtos.response;

import java.math.BigDecimal;

/**
 * Record de response que representa un producto asignado a un proveedor.
 * Usado dentro de ProveedorDetalleDTO agrupado por categoría.
 */
public record ProductoConPrecioDTO(
        Integer idProducto,
        Long idProveedorProducto,
        String nombreProducto,
        String nombreCategoria,
        String nombreUnidad,
        String abreviatura,
        Boolean activo,
        String fechaActualizacion,
        String marcaProducto,
        String formatoContenido,
        BigDecimal precioNeto,
        BigDecimal precioConIva
) {
    /**
     * Factory method para construir desde un Object[] de consulta nativa.
     * Índices:
     * [0]  id_producto
     * [1]  id_proveedor_producto
     * [2]  nombre_producto
     * [3]  nombre_categoria
     * [4]  nombre_unidad
     * [5]  abreviatura
     * [6]  activo
     * [7]  fecha_actualizacion
     * [8]  marca_producto
     * [9]  formato_contenido
     * [10] precio_neto
     * [11] precio_con_iva
     */
    public static ProductoConPrecioDTO fromRow(Object[] row) {
        return new ProductoConPrecioDTO(
                ((Number) row[0]).intValue(),
                ((Number) row[1]).longValue(),
                (String) row[2],
                (String) row[3],
                (String) row[4],
                (String) row[5],
                (Boolean) row[6],
                row[7] != null ? row[7].toString() : null,
                (String) row[8],
                (String) row[9],
                new BigDecimal(row[10].toString()),
                new BigDecimal(row[11].toString())
        );
    }
}
