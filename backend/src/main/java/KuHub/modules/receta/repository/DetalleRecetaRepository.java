package KuHub.modules.receta.repository;

import KuHub.modules.receta.entity.DetalleReceta;
import KuHub.modules.receta.entity.Receta;
import KuHub.modules.receta.projection.DetalleRecetaIdProductoProjection;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetalleRecetaRepository extends JpaRepository<DetalleReceta, Integer> {
    @Query(
            value = "SELECT setval('detalle_receta_id_detalle_receta_seq', (SELECT COALESCE(MAX(id_detalle_receta), 1) FROM detalle_receta))",
            nativeQuery = true
    )
    Integer syncSeqDetalleReceta();
    List<DetalleReceta> findAllByReceta(Receta receta);

    /**
     * Borra todos los 'DetalleReceta' que pertenezcan a una Receta específica
     * Y que además tengan un ID de Producto que esté en la lista_de_ids.
     *
     * 1. @Modifying: ¡OBLIGATORIO! Le dice a Spring que esta consulta
     * modifica datos (no es un SELECT).
     *
     * 2. @Query: Usamos JPQL (lenguaje de JPA).
     * - 'DetalleReceta d': 'd' es un alias para tu entidad.
     * - 'd.receta.idReceta': Navegamos al ID de la Receta.
     * - 'd.producto.idProducto': Navegamos al ID del Producto.
     */
    @Modifying
    @Query("DELETE FROM DetalleReceta d " +
            "WHERE d.receta.idReceta = :idReceta " +
            "AND d.producto.idProducto IN :idsProducto")
    void deleteByRecetaAndProductoIds(@Param("idReceta") Integer idReceta,
                                     @Param("idsProducto") List<Integer> idsProducto);

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

    // === SELECT solo los datos necesarios para comparar ===
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



}
