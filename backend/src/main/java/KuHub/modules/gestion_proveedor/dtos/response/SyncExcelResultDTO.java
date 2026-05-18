package KuHub.modules.gestion_proveedor.dtos.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Record que representa el resultado de la sincronización de precios desde Excel.
 * Devuelto por POST /api/v1/proveedor/{id}/sync-precios-excel.
 *
 * - sincronizados: productos cuyo precio cambió → nueva versión activa insertada.
 * - sinCambios:    productos cuyo precio coincide con la versión activa actual
 *                  → NO se versiona; sólo se reporta para visibilidad.
 *                  Otros campos (marca / formato) no son criterio de versioning.
 * - noEncontrados: filas con campos válidos pero cuyo nombre de producto no existe en el sistema.
 *
 * Las filas sin nombre / sin cantidad / sin precios se descartan internamente y no se reportan.
 */
public record SyncExcelResultDTO(
        int totalSincronizados,
        int totalSinCambios,
        int totalNoEncontrados,
        List<ProductoSincronizado> sincronizados,
        List<ProductoSinCambios> sinCambios,
        List<ProductoNoEncontrado> noEncontrados
) {
    /** Producto cuyo precio cambió y generó una nueva versión activa. */
    public record ProductoSincronizado(
            int fila,
            String nombreProducto,
            BigDecimal precioNeto,
            BigDecimal precioConIva
    ) {}

    /** Producto cuyo precio (neto e IVA) coincide con la versión activa actual; no se versiona. */
    public record ProductoSinCambios(
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
