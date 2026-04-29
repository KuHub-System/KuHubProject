package KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection;

import org.springframework.beans.factory.annotation.Value;

public interface PedidoSemanaBodegaWithDetailsView {
    @Value("#{target.idPedidoSemanaBodega}")
    Integer getIdPedidoSemanaBodega();

    @Value("#{target.nombrePedido}")
    String getNombrePedido();

    @Value("#{target.descripcionPedido}")
    String getDescripcionPedido();

    @Value("#{target.estadoPedido}")
    String getEstadoPedido();

    @Value("#{target.totalDetalles}")
    Long getTotalDetalles();

    @Value("#{target.detallesJson}")
    String getDetallesJson();
}
