package KuHub.modules.pedido_semana_a_bodega.repository;

import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaItemProjection;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.DetailsByUpdateView;
import KuHub.modules.pedido_semana_a_bodega.entity.DetallePedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.DetallePedidoSemanaBodegaIdProductoProjection;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.PedidoSemanaBodegaDetailsView;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetallePedidoSemanaBodegaRepository extends JpaRepository<DetallePedidoSemanaBodega, Integer> {

    /** Obtiene los detalles para actualizar, omitiendo la referencia a pedido semana bodega. */
    @Query(value = """
        SELECT
            d.id_detalle_pedido_semana AS "idDetalle",
            d.id_producto AS "idProducto",
            d.cant_producto AS "cantidad"
        FROM detalle_pedido_semana_bodega d
        WHERE d.id_pedido_semana_bodega = :idPedidoSemanaBodega
        """, nativeQuery = true)
    List<DetailsByUpdateView> findDetailsForUpdate(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);


    /** Elimina los detalles cuyo producto fue removido en el frontend. */
    @Modifying
    @Query("DELETE FROM DetallePedidoSemanaBodega d " +
            "WHERE d.pedidoSemanaBodega.idPedidoSemanaBodega = :idPedidoSemanaBodega " +
            "AND d.producto.idProducto IN :idsProducto")
    int deleteByRecetaAndProductoIds(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega,
                                     @Param("idsProducto") List<Integer> idsProducto);

    /** Actualiza la cantidad de un producto en un pedido semana bodega. */
    @Modifying
    @Query("""
       UPDATE DetallePedidoSemanaBodega d
       SET d.cantProducto = :cant
       WHERE d.pedidoSemanaBodega.idPedidoSemanaBodega = :idPedidoSemanaBodega
       AND d.producto.idProducto = :idProducto
       """)
    int updateQuantityByRecipeAndProduct(
            @Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega,
            @Param("idProducto") Integer idProducto,
            @Param("cant") java.math.BigDecimal cant
    );

    /** Actualiza la observación de un producto en un pedido semana bodega. */
    @Modifying
    @Query("""
       UPDATE DetallePedidoSemanaBodega d
       SET d.observacion = :observacion
       WHERE d.pedidoSemanaBodega.idPedidoSemanaBodega = :idPedidoSemanaBodega
       AND d.producto.idProducto = :idProducto
       """)
    int updateObservacionByRecipeAndProduct(
            @Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega,
            @Param("idProducto") Integer idProducto,
            @Param("observacion") String observacion
    );

    /**Validaciones boleanas*/








///

    @Query("""
    SELECT
        p.idProducto AS idProducto,
        p.nombreProducto AS nombreProducto,
        d.cantProducto AS cantProducto,
        p.unidadMedida AS unidadMedida,
        p.activo AS activo
    FROM DetallePedidoSemanaBodega d
    JOIN d.producto p
    WHERE d.pedidoSemanaBodega.idPedidoSemanaBodega = :idPedidoSemanaBodega
""")
    List<DetallePedidoSemanaBodegaItemProjection> findItemsByRecetaId(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);

    @Query("""
        SELECT d.producto.idProducto AS idProducto,
               d.cantProducto AS cantProducto
        FROM DetallePedidoSemanaBodega d
        WHERE d.pedidoSemanaBodega.idPedidoSemanaBodega = :idPedidoSemanaBodega
          AND d.producto.activo = true
    """)
    List<DetallePedidoSemanaBodegaIdProductoProjection> findAllIdProductoAndCantidadByReceta(
            @Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega
    );

    List<DetallePedidoSemanaBodega> findDetalleRecetaByPedidoSemanaBodega_IdPedidoSemanaBodega(Integer idPedidoSemanaBodega);

    @Query("SELECT " +
            "  dr.idDetallePedidoSemana AS idDetallePedidoSemana, " +
            "  dr.producto.idProducto AS idProducto, " +
            "  dr.cantProducto AS cantProducto, " +
            "  dr.producto.unidadMedida AS unidadMedida " +
            "FROM DetallePedidoSemanaBodega dr " +
            "WHERE dr.pedidoSemanaBodega.idPedidoSemanaBodega = :idPedidoSemanaBodega " +
            "AND dr.producto.activo = true")
    List<PedidoSemanaBodegaDetailsView> findActiveDetailsByRecipeId(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);


    @Query("SELECT d.producto.idProducto FROM DetallePedidoSemanaBodega d WHERE d.pedidoSemanaBodega.idPedidoSemanaBodega = :idPedidoSemanaBodega")
    List<Integer> findProductoIdsByRecetaId(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);

    List<DetallePedidoSemanaBodega> findAllByPedidoSemanaBodega(PedidoSemanaBodega pedidoSemanaBodega);
}
