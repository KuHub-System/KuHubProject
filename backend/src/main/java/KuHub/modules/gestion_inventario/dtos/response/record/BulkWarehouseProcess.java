package KuHub.modules.gestion_inventario.dtos.response.record;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record BulkWarehouseProcess(
        List<ItemResult> exitosos,
        List<ItemResult> advertencias,
        List<ItemResult> errores
) {

    // =========================================================
    // 1. DTO de Entrada — @RequestBody List<BulkWarehouseProcess.ItemRequest>
    // =========================================================
    public record ItemRequest(
            @NotNull(message = "El ID de la bodega de tránsito es obligatorio")
            Integer idBodegaTransito,

            @NotNull(message = "La cantidad (delta) es obligatoria")
            BigDecimal delta,

            @NotNull(message = "El stock en vista es obligatorio")
            BigDecimal stockEnVista,

            @NotNull(message = "El tipo de movimiento es obligatorio")
            String tipoMovimiento,

            Integer idSolicitud,
            Integer idPedido,
            Integer idOrdenPedido,
            Integer idDetalleOrdenPedido
    ) {}

    // =========================================================
    // 2. DTO de Detalle — ítem dentro de exitosos / advertencias / errores
    // =========================================================
    public record ItemResult(
            Integer idBodegaTransito,
            String producto,
            BigDecimal stockResultante,
            String mensaje
    ) {}
}
