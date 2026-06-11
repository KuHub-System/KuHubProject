package KuHub.modules.gestion_orden_pedido.dtos.response;

/**
 * Resumen liviano de una Orden de Pedido para mostrar en el modal de rechazo de pedido
 * (Conglomerado de Pedidos · vista Por Pedido). Indica el estado actual de la OP y su proveedor
 * para que el usuario decida si confirma cancelarlas junto con el rechazo del pedido.
 */
public record OrdenPedidoResumenDTO(
        Integer idOrdenPedido,
        String estado,
        String nombreProveedor
) {}
