package KuHub.modules.gestion_pedido.services;

import KuHub.modules.gestion_pedido.record.CreateOrder;

public interface PedidoService {

    boolean consolidateOrder(CreateOrder request);
}
