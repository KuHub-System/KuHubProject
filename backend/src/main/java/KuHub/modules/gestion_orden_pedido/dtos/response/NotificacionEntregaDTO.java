package KuHub.modules.gestion_orden_pedido.dtos.response;

/**
 * DTO para notificaciones de entregas programadas para hoy o ayer.
 * Agrupa por OP + fecha_entrega los detalles con entregado=false,
 * de OPs en estado CONFIRMADA.
 *
 * [0] id_orden_pedido      (Integer)
 * [1] nombre_distribuidora (String)
 * [2] fecha_entrega        (String YYYY-MM-DD)
 * [3] cantidad_productos   (Long — COUNT de detalles pendientes)
 */
public record NotificacionEntregaDTO(
        int idOrdenPedido,
        String nombreDistribuidora,
        String fechaEntrega,
        int cantidadProductos
) {
    public static NotificacionEntregaDTO fromRow(Object[] row) {
        return new NotificacionEntregaDTO(
                ((Number) row[0]).intValue(),
                (String) row[1],
                (String) row[2],
                ((Number) row[3]).intValue()
        );
    }
}
