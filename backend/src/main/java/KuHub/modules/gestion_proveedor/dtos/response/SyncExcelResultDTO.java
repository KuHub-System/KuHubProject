package KuHub.modules.gestion_proveedor.dtos.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Record que representa el resultado de la sincronización de precios desde Excel.
 * Devuelto por POST /api/v1/proveedor/{id}/sync-precios-excel.
 *
 * - sincronizados: detalle de cada producto actualizado con su nombre y nuevos precios.
 * - noEncontrados: filas con campos válidos pero cuyo nombre de producto no existe en el sistema.
 *
 * Las filas sin nombre / sin cantidad / sin precios se descartan internamente y no se reportan.
 */
public record SyncExcelResultDTO(
        int totalSincronizados,
        int totalNoEncontrados,
        List<ProductoSincronizado> sincronizados,
        List<ProductoNoEncontrado> noEncontrados
) {
    /** Producto sincronizado correctamente. */
    public record ProductoSincronizado(
            int fila,
            String nombreProducto,
            BigDecimal precioNeto,
            BigDecimal precioConIva
    ) {}

    /** Fila con datos válidos pero cuyo nombre no coincide con ningún producto del sistema. */
    public record ProductoNoEncontrado(
            int fila,
            String nombreExcel
    ) {}
}
