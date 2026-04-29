package KuHub.modules.pedido_semana_a_bodega.services;

import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetalleRecetaItemProjection;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetalleRecetaIdProductoProjection;
import feign.Param;

import java.util.List;

public interface DetalleRecetaService {

    DetallePedidoSemanaBodega findById(Integer id);

    List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(Integer idReceta);

    List<DetallePedidoSemanaBodega> findAll();

    List<DetallePedidoSemanaBodega> findAllByReceta(PedidoSemanaBodega receta);

    List<DetallePedidoSemanaBodega> findAllByIdReceta(Integer id);

    List<Integer> findProductoIdsByRecetaId(@Param("idReceta") Integer idReceta);

    List<DetalleRecetaItemProjection> findItemsByRecetaId(@Param("idReceta") Integer idReceta);

    List<DetallePedidoSemanaBodega> saveAll(List<DetallePedidoSemanaBodega> detalles);

    DetallePedidoSemanaBodega save(DetallePedidoSemanaBodega detalleReceta);



    void deleteById(Integer id);

}
