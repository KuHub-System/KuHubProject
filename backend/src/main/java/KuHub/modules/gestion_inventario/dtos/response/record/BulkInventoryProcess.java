package KuHub.modules.gestion_inventario.dtos.response.record;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record BulkInventoryProcess(
        List<ItemResult> exitosos,
        List<ItemResult> advertencias,
        List<ItemResult> errores
) {

    // =========================================================
    // 1. DTO de Entrada (Lo que envía el Frontend en una lista)
    // Uso: @RequestBody List<BulkInventoryProcessDTO.ItemRequest>
    // =========================================================
    public record ItemRequest(
            @NotNull(message = "El ID del inventario es obligatorio")
            Integer idInventario,

            @NotNull(message = "La cantidad (delta) es obligatoria")
            BigDecimal delta,

            @NotNull(message = "El stock en vista es obligatorio")
            BigDecimal stockEnVista,

            @NotNull(message = "El tipo de movimiento es obligatorio")
            String tipoMovimiento
    ) {}

    // =========================================================
    // 2. DTO de Detalle (Lo que va dentro de las listas del Reporte)
    // =========================================================
    public record ItemResult(
            Integer idInventario,
            String producto,
            BigDecimal stockResultante,
            String mensaje
    ) {}
}