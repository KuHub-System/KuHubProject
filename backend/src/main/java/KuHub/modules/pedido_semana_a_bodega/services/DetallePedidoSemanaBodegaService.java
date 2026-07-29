package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaItemProjection;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaIdProductoProjection;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DetallePedidoSemanaBodegaService {

    DetallePedidoSemanaBodega findById(Integer id);

    List<DetallePedidoSemanaBodegaIdProductoProjection> findAllIdProductoAndCantidadByPedidoSemanaBodega(Integer idPedidoSemanaBodega);

    List<DetallePedidoSemanaBodega> findAll();

    List<DetallePedidoSemanaBodega> findAllByPedidoSemanaBodega(PedidoSemanaBodega pedidoSemanaBodega);

    List<DetallePedidoSemanaBodega> findAllByIdPedidoSemanaBodega(Integer id);

    List<Integer> findProductoIdsByPedidoSemanaBodegaId(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);

    List<DetallePedidoSemanaBodegaItemProjection> findItemsByPedidoSemanaBodegaId(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);

    List<DetallePedidoSemanaBodega> saveAll(List<DetallePedidoSemanaBodega> detalles);

    DetallePedidoSemanaBodega save(DetallePedidoSemanaBodega detallePedidoSemanaBodega);



    void deleteById(Integer id);

}
