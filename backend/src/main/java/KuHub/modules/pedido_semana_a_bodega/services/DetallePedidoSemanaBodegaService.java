package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaItemProjection;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaIdProductoProjection;
import feign.Param;

import java.util.List;

public interface DetallePedidoSemanaBodegaService {

    DetallePedidoSemanaBodega findById(Integer id);

    List<DetallePedidoSemanaBodegaIdProductoProjection> findAllIdProductoAndCantidadByReceta(Integer idReceta);

    List<DetallePedidoSemanaBodega> findAll();

    List<DetallePedidoSemanaBodega> findAllByReceta(PedidoSemanaBodega receta);

    List<DetallePedidoSemanaBodega> findAllByIdReceta(Integer id);

    List<Integer> findProductoIdsByRecetaId(@Param("idReceta") Integer idReceta);

    List<DetallePedidoSemanaBodegaItemProjection> findItemsByRecetaId(@Param("idReceta") Integer idReceta);

    List<DetallePedidoSemanaBodega> saveAll(List<DetallePedidoSemanaBodega> detalles);

    DetallePedidoSemanaBodega save(DetallePedidoSemanaBodega detalleReceta);



    void deleteById(Integer id);

}
