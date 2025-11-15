package KuHub.modules.receta.services;

import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.service.ProductoService;
import KuHub.modules.receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.receta.entity.DetalleReceta;
import KuHub.modules.receta.entity.Receta;
import KuHub.modules.receta.exceptions.RecetaException;
import KuHub.modules.receta.projection.DetalleRecetaIdProductoProjection;
import KuHub.modules.receta.repository.DetalleRecetaRepository;
import feign.Param;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DetalleRecetaServiceImp implements DetalleRecetaService{

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Autowired
    private ProductoService productoService;


    @Transactional
    @Override
    public void syncSeqDetalleReceta(){
        Integer nuevoValor = detalleRecetaRepository.syncSeqDetalleReceta();
        System.out.println("Secuencia sincronizada. Nuevo valor: " + nuevoValor);
    }

    @Transactional
    @Override
    public List<DetalleReceta> findAll(){
        return detalleRecetaRepository.findAll();
    }

    @Transactional
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

    @Transactional
    @Override
    public DetalleReceta findById(Integer id){
        return detalleRecetaRepository.findById(id).orElseThrow(
                ()-> new RecetaException("No existe el detalle receta con el id: " + id)
        );
    }

    @Transactional
    @Override
    public List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(
            Integer idReceta){
        return detalleRecetaRepository.findAllIdProductoAndCantidadByReceta(idReceta);
    }



    @Transactional
    @Override
    public DetalleReceta save (DetalleReceta dr){
        syncSeqDetalleReceta();
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

}
