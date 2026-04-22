package KuHub.modules.gestion_proveedor.dtos.response;

/**
 * Record de response para listar proveedores en la tabla principal del frontend.
 * Incluye la cantidad de productos activos asignados al proveedor.
 * Índices del Object[] de consulta nativa:
 * [0] id_proveedor
 * [1] rut_proveedor
 * [2] nombre_distribuidora
 * [3] nombre_proveedor
 * [4] telefono_proveedor
 * [5] email_proveedor
 * [6] estado_proveedor
 * [7] activo
 * [8] fecha_creacion
 * [9] cantidad_productos_activos
 */
public record ProveedorListDTO(
        Integer idProveedor,
        String rutProveedor,
        String nombreDistribuidora,
        String nombreProveedor,
        String telefonoProveedor,
        String emailProveedor,
        String estadoProveedor,
        Boolean activo,
        String fechaCreacion,
        Long cantidadProductosActivos
) {
    /**
     * Factory method para construir desde un Object[] de consulta nativa.
     */
    public static ProveedorListDTO fromRow(Object[] row) {
        return new ProveedorListDTO(
                ((Number) row[0]).intValue(),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                (String) row[4],
                (String) row[5],
                (String) row[6],
                (Boolean) row[7],
                row[8] != null ? row[8].toString() : null,
                row[9] != null ? ((Number) row[9]).longValue() : 0L
        );
    }
}
