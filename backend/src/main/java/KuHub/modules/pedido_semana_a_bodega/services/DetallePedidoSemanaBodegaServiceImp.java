package KuHub.modules.pedido_semana_a_bodega.services;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetalleRecetaItemProjection;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.exceptions.PedidoSemanaBodegaException;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetalleRecetaIdProductoProjection;
import KuHub.modules.pedido_semana_a_bodega.repository.DetallePedidoSemanaBodegaRepository;
import feign.Param;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DetalleRecetaServiceImp implements DetalleRecetaService{

    @Autowired
    private DetallePedidoSemanaBodegaRepository detalleRecetaRepository;

    @Transactional(readOnly = true)
    @Override
    public DetallePedidoSemanaBodega findById(Integer id){
        return detalleRecetaRepository.findById(id).orElseThrow(
                ()-> new PedidoSemanaBodegaException("No existe el detalle receta con el id: " + id
                        , HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodega> findAll(){
        return detalleRecetaRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodega> findAllByReceta(PedidoSemanaBodega receta){

        if (receta == null) {
            throw new PedidoSemanaBodegaException("La receta no puede ser nula"
                    , HttpStatus.NOT_FOUND);
        }
        List<DetallePedidoSemanaBodega> detalles = detalleRecetaRepository.findAllByPedidoSemanaBodega(receta);
        if (detalles.isEmpty()) {
            throw new PedidoSemanaBodegaException("La receta no tiene detalles"
                    , HttpStatus.NOT_FOUND);
        }
        return detalles;
    }

    @Transactional(readOnly = true)
    @Override
    public List<Integer> findProductoIdsByRecetaId(@Param("idReceta") Integer idReceta){
        return detalleRecetaRepository.findProductoIdsByRecetaId(idReceta);
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetalleRecetaItemProjection> findItemsByRecetaId(@Param("idReceta") Integer idReceta){
        return detalleRecetaRepository.findItemsByRecetaId(idReceta);
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetallePedidoSemanaBodega> findAllByIdReceta(Integer id){
        return detalleRecetaRepository.findDetalleRecetaByPedidoSemanaBodega_IdPedidoSemanaBodega(id);
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(
            Integer idReceta){
        return detalleRecetaRepository.findAllIdProductoAndCantidadByReceta(idReceta);
    }

    @Override
    public List<DetallePedidoSemanaBodega> saveAll(List<DetallePedidoSemanaBodega> detalles) {
        return detalleRecetaRepository.saveAll(detalles);
    }

    @Transactional
    @Override
    public DetallePedidoSemanaBodega save (DetallePedidoSemanaBodega dr){
        return detalleRecetaRepository.save(dr);
    }



    @Transactional
    @Override
    public void deleteById(Integer id){
        if( !detalleRecetaRepository.existsById(id) ){
            throw new PedidoSemanaBodegaException("No existe detalle receta con id " + id
                    , HttpStatus.NOT_FOUND);
        }
        detalleRecetaRepository.deleteById(id);
    }

}
