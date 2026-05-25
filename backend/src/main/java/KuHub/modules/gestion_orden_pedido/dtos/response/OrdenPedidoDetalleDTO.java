package KuHub.modules.gestion_orden_pedido.dtos.response;

import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;

import java.time.LocalDateTime;

/** Resumen de una Orden de Pedido recién creada. */
public record OrdenPedidoDetalleDTO(
        Integer idOrdenPedido,
        Integer idPedido,
        Integer idProveedor,
        LocalDateTime fechaCreacion,
        EstadoOrdenPedido estadoOrdenPedido,
        int cantidadDetalles
) {}
