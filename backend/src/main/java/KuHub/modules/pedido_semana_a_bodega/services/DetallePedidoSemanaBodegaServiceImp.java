package KuHub.modules.pedido_semana_a_bodega.services;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaItemProjection;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.exceptions.PedidoSemanaBodegaException;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaIdProductoProjection;
import KuHub.modules.pedido_semana_a_bodega.repository.DetallePedidoSemanaBodegaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DetallePedidoSemanaBodegaServiceImp implements DetallePedidoSemanaBodegaService{

    @Autowired
    private DetallePedidoSemanaBodegaRepository detallePedidoSemanaBodegaRepository;

    @Transactional(readOnly = true)
    @Override
    public DetallePedidoSemanaBodega findById(Integer id){
        return detallePedidoSemanaBodegaRepository.findById(id).orElseThrow(
                ()-> new PedidoSemanaBodegaException("No existe el detalle pedidoSemanaBodega con el id: " + id
                        , HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodega> findAll(){
        return detallePedidoSemanaBodegaRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodega> findAllByPedidoSemanaBodega(PedidoSemanaBodega pedidoSemanaBodega){

        if (pedidoSemanaBodega == null) {
            throw new PedidoSemanaBodegaException("La pedidoSemanaBodega no puede ser nula"
                    , HttpStatus.NOT_FOUND);
        }
        List<DetallePedidoSemanaBodega> detalles = detallePedidoSemanaBodegaRepository.findAllByPedidoSemanaBodega(pedidoSemanaBodega);
        if (detalles.isEmpty()) {
            throw new PedidoSemanaBodegaException("La pedidoSemanaBodega no tiene detalles"
                    , HttpStatus.NOT_FOUND);
        }
        return detalles;
    }

    @Transactional(readOnly = true)
    @Override
    public List<Integer> findProductoIdsByPedidoSemanaBodegaId(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega){
        return detallePedidoSemanaBodegaRepository.findProductoIdsByPedidoSemanaBodegaId(idPedidoSemanaBodega);
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodegaItemProjection> findItemsByPedidoSemanaBodegaId(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega){
        return detallePedidoSemanaBodegaRepository.findItemsByPedidoSemanaBodegaId(idPedidoSemanaBodega);
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodega> findAllByIdPedidoSemanaBodega(Integer id){
        return detallePedidoSemanaBodegaRepository.findDetallePedidoSemanaBodegaByPedidoSemanaBodega_IdPedidoSemanaBodega(id);
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodegaIdProductoProjection> findAllIdProductoAndCantidadByPedidoSemanaBodega(
            Integer idPedidoSemanaBodega){
        return detallePedidoSemanaBodegaRepository.findAllIdProductoAndCantidadByPedidoSemanaBodega(idPedidoSemanaBodega);
    }

    @Override
    public List<DetallePedidoSemanaBodega> saveAll(List<DetallePedidoSemanaBodega> detalles) {
        return detallePedidoSemanaBodegaRepository.saveAll(detalles);
    }

    @Transactional
    @Override
    public DetallePedidoSemanaBodega save (DetallePedidoSemanaBodega dr){
        return detallePedidoSemanaBodegaRepository.save(dr);
    }



    @Transactional
    @Override
    public void deleteById(Integer id){
        if( !detallePedidoSemanaBodegaRepository.existsById(id) ){
            throw new PedidoSemanaBodegaException("No existe detalle pedidoSemanaBodega con id " + id
                    , HttpStatus.NOT_FOUND);
        }
        detallePedidoSemanaBodegaRepository.deleteById(id);
    }

}
