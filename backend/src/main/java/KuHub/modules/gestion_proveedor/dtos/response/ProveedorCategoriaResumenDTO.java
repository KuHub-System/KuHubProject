package KuHub.modules.gestion_proveedor.dtos.response;

/**
 * Record de response con el resumen de una categoría dentro del catálogo de un
 * proveedor: totales para pintar el encabezado de la categoría sin traer todavía
 * sus productos (que se piden paginados por separado).
 */
public record ProveedorCategoriaResumenDTO(
        Short idCategoria,
        String nombreCategoria,
        Long totalProductos,
        Long totalActivos,
        Long totalDesincronizados
) {
    /**
     * Factory method para construir desde un Object[] de consulta nativa.
     * Índices:
     * [0] id_categoria
     * [1] nombre_categoria
     * [2] total_productos
     * [3] total_activos
     * [4] total_desincronizados
     */
    public static ProveedorCategoriaResumenDTO fromRow(Object[] row) {
        return new ProveedorCategoriaResumenDTO(
                ((Number) row[0]).shortValue(),
                (String) row[1],
                ((Number) row[2]).longValue(),
                ((Number) row[3]).longValue(),
                ((Number) row[4]).longValue()
        );
    }
}
