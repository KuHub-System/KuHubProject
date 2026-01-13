package KuHub.modules.gestion_receta.repository;

import KuHub.modules.gestion_receta.dtos.projection.DetalleRecetaItemProjection;
import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_receta.dtos.projection.DetalleRecetaIdProductoProjection;
import KuHub.modules.gestion_receta.dtos.projection.RecipeDetailsView;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetalleRecetaRepository extends JpaRepository<DetalleReceta, Integer> {

    @Query("""
    SELECT 
        p.idProducto AS idProducto,
        p.nombreProducto AS nombreProducto,
        d.cantProducto AS cantProducto,
        p.unidadMedida AS unidadMedida,
        p.activo AS activo
    FROM DetalleReceta d
    JOIN d.producto p
    WHERE d.receta.idReceta = :idReceta
""")
    List<DetalleRecetaItemProjection> findItemsByRecetaId(@Param("idReceta") Integer idReceta);

    @Query("""
        SELECT d.producto.idProducto AS idProducto,
               d.cantProducto AS cantProducto
        FROM DetalleReceta d
        WHERE d.receta.idReceta = :idReceta
          AND d.producto.activo = true
    """)
    List<DetalleRecetaIdProductoProjection> findAllIdProductoAndCantidadByReceta(
            @Param("idReceta") Integer idReceta
    );

    List<DetalleReceta> findDetalleRecetaByReceta_IdReceta(Integer idReceta);

    @Query("SELECT " +
            "  dr.idDetalleReceta AS idDetalleReceta, " +
            "  dr.producto.idProducto AS idProducto, " +
            "  dr.cantProducto AS cantProducto, " +
            "  dr.producto.unidadMedida AS unidadMedida " +
            "FROM DetalleReceta dr " +
            "WHERE dr.receta.idReceta = :idReceta " +
            "AND dr.producto.activo = true")
    List<RecipeDetailsView> findActiveDetailsByRecipeId(@Param("idReceta") Integer idReceta);


    @Query("SELECT d.producto.idProducto FROM DetalleReceta d WHERE d.receta.idReceta = :idReceta")
    List<Integer> findProductoIdsByRecetaId(@Param("idReceta") Integer idReceta);

    @Modifying
    @Query("""
       UPDATE DetalleReceta d
       SET d.cantProducto = :cant
       WHERE d.receta.idReceta = :idReceta
       AND d.producto.idProducto = :idProducto
       """)
    void updateQuantityByIdRecetaAndIdProducto(
            @Param("idReceta") Integer idReceta,
            @Param("idProducto") Integer idProducto,
            @Param("cant") Double cant
    );

    @Modifying
    @Query("DELETE FROM DetalleReceta d " +
            "WHERE d.receta.idReceta = :idReceta " +
            "AND d.producto.idProducto IN :idsProducto")
    void deleteByRecetaAndProductoIds(@Param("idReceta") Integer idReceta,
                                      @Param("idsProducto") List<Integer> idsProducto);

    List<DetalleReceta> findAllByReceta(Receta receta);
}
