package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.modules.gestion_inventario.entity.Movimiento;

/**
 * Transportador interno para resultados de movimientos en lote.
 */
public record BulkMovementResult(
        boolean hasError,
        String errorMessage,
        Movimiento movimiento
) {
    // Factory methods para limpiar el código en el Service
    public static BulkMovementResult error(String message) {
        return new BulkMovementResult(true, message, null);
    }

    public static BulkMovementResult success(Movimiento movimiento) {
        return new BulkMovementResult(false, null, movimiento);
    }
}