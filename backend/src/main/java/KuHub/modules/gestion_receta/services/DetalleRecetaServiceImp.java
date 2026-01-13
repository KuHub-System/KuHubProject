package KuHub.modules.gestion_receta.services;
import KuHub.modules.gestion_receta.dtos.projection.DetalleRecetaItemProjection;
import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_receta.exceptions.RecetaException;
import KuHub.modules.gestion_receta.dtos.projection.DetalleRecetaIdProductoProjection;
import KuHub.modules.gestion_receta.repository.DetalleRecetaRepository;
import feign.Param;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DetalleRecetaServiceImp implements DetalleRecetaService{

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Transactional(readOnly = true)
    @Override
    public DetalleReceta findById(Integer id){
        return detalleRecetaRepository.findById(id).orElseThrow(
                ()-> new RecetaException("No existe el detalle receta con el id: " + id)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetalleReceta> findAll(){
        return detalleRecetaRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetalleReceta> findAllByReceta(Receta receta){

        if (receta == null) {
            throw new RecetaException("La receta no puede ser nula");
        }
        List<DetalleReceta> detalles = detalleRecetaRepository.findAllByReceta(receta);
        if (detalles.isEmpty()) {
            throw new RecetaException("La receta no tiene detalles");
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
    public List<DetalleReceta> findAllByIdReceta(Integer id){
        return detalleRecetaRepository.findDetalleRecetaByReceta_IdReceta(id);
    }

    @Transactional(readOnly = true)
    @Override
    public List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(
            Integer idReceta){
        return detalleRecetaRepository.findAllIdProductoAndCantidadByReceta(idReceta);
    }

    @Override
    public List<DetalleReceta> saveAll(List<DetalleReceta> detalles) {
        return detalleRecetaRepository.saveAll(detalles);
    }

    @Transactional
    @Override
    public DetalleReceta save (DetalleReceta dr){
        return detalleRecetaRepository.save(dr);
    }

    @Transactional
    @Override
    public void updateQuantityByIdRecetaAndIdProducto(Integer idReceta, Integer idProducto, Double cantidad){
        detalleRecetaRepository.updateQuantityByIdRecetaAndIdProducto(idReceta,idProducto,cantidad );
    }

    @Transactional
    @Override
    public void deleteByRecetaAndProductoIds(Integer idReceta, List<Integer> idsProducto){
        detalleRecetaRepository.deleteByRecetaAndProductoIds(idReceta,idsProducto);
    }

    @Transactional
    @Override
    public void deleteById(Integer id){
        if( !detalleRecetaRepository.existsById(id) ){
            throw new RecetaException("No existe detalle receta con id " + id);
        }
        detalleRecetaRepository.deleteById(id);
    }

}
