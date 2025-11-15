package KuHub.modules.receta.services;

import KuHub.modules.receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.receta.entity.DetalleReceta;
import KuHub.modules.receta.entity.Receta;
import KuHub.modules.receta.projection.DetalleRecetaIdProductoProjection;
import feign.Param;

import java.util.List;

public interface DetalleRecetaService {

    void syncSeqDetalleReceta();

    List<DetalleReceta> findAll();
    List<DetalleReceta> findAllByReceta(Receta receta);
    DetalleReceta findById(Integer id);
    List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(Integer idReceta);
    DetalleReceta save (DetalleReceta detalleReceta);
    void deleteByRecetaAndProductoIds(@Param("idReceta") Integer idReceta,
                                     @Param("idsProducto") List<Integer> idsProducto);
    //DetalleReceta update(Integer idDetalle, Double nuevaCantidad);

    void updateQuantityByIdRecetaAndIdProducto(
            @Param("idReceta") Integer idReceta,
            @Param("idProducto") Integer idProducto,
            @Param("cantidad") Double cantidad
    );

}
