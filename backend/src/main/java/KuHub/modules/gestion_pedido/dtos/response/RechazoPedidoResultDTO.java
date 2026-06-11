package KuHub.modules.gestion_pedido.dtos.response;

/**
 * Resultado del rechazo de un pedido completo: cantidad de solicitudes que pasaron a RECHAZADA,
 * cantidad de Órdenes de Pedido canceladas y cantidad de reservas de stock liberadas.
 */
public record RechazoPedidoResultDTO(
        int solicitudesRechazadas,
        int ordenesCanceladas,
        int reservasLiberadas
) {}
