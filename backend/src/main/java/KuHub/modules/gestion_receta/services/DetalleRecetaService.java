package KuHub.modules.gestion_receta.services;

import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_receta.projection.DetalleRecetaIdProductoProjection;
import feign.Param;

import java.util.List;

public interface DetalleRecetaService {

    DetalleReceta findById(Integer id);

    List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(Integer idReceta);

    List<DetalleReceta> findAll();

    List<DetalleReceta> findAllByReceta(Receta receta);

    List<DetalleReceta> findAllByIdReceta(Integer id);

    DetalleReceta save(DetalleReceta detalleReceta);

    void updateQuantityByIdRecetaAndIdProducto(
            @Param("idReceta") Integer idReceta,
            @Param("idProducto") Integer idProducto,
            @Param("cantidad") Double cantidad
    );

    void deleteByRecetaAndProductoIds(@Param("idReceta") Integer idReceta,
                                      @Param("idsProducto") List<Integer> idsProducto);

    void deleteById(Integer id);

}
