package KuHub.modules.gestion_pedido.services;

import KuHub.modules.gestion_pedido.record.ChangePedidoStatusDTO;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.record.PedidoDashboardRecords;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;

public interface PedidoService {

    PedidoDashboardRecords.PedidoDashboardResponse obtenerDashboardPedidos(DateRangeDTO request);
    boolean consolidateOrder(CreateOrder request);

    /**
     * Cambia el estado de uno o varios pedidos de forma masiva.
     * Retorna true si al menos una fila fue afectada.
     */
    boolean changeMassiveStatus(ChangePedidoStatusDTO request);
}
