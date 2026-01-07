package KuHub.modules.gestion_receta.services;

import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_receta.projection.DetalleRecetaIdProductoProjection;
import feign.Param;

import java.util.List;

public interface DetalleRecetaService {

    void syncSeqDetalleReceta();

    DetalleReceta findById(Integer id);

    List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(Integer idReceta);

    List<DetalleReceta> findAll();

    List<DetalleReceta> findAllByReceta(Receta receta);

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
