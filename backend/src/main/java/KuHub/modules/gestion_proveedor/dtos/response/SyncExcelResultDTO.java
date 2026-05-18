package KuHub.modules.gestion_proveedor.dtos.response;

import java.util.List;

/**
 * Record que representa el resultado de la sincronización de precios desde Excel.
 * Devuelto por POST /api/v1/proveedor/{id}/sync-precios-excel.
 *
 * - sincronizados: filas insertadas correctamente (nuevas versiones de proveedor_producto).
 * - omitidos:     filas saltadas (EJEMPLO, sin nombre, sin cantidad, sin precios).
 * - errores:      filas que cumplían las condiciones mínimas pero no se pudieron sincronizar
 *                 (producto no encontrado, error de parseo, etc.).
 */
public record SyncExcelResultDTO(
        int sincronizados,
        int omitidos,
        List<ErrorFila> errores
) {
    /** Error asociado a una fila específica del Excel. */
    public record ErrorFila(int fila, String mensaje) {}
}
