package KuHub.modules.pedido_semana_a_bodega.repository;

import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.RecipeWithDetailsView;
import KuHub.modules.pedido_semana_a_bodega.entity.PedidoSemanaBodega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface PedidoSemanaBodegaRepository extends JpaRepository<PedidoSemanaBodega,Integer> {

    /** Busca un pedido semana bodega activo por ID. */
    Optional<PedidoSemanaBodega> findByIdPedidoSemanaBodegaAndActivoIsTrue(Integer idPedidoSemanaBodega);

    /** Lista todos los pedidos semana bodega activos sin paginación. */
    List<PedidoSemanaBodega> findAllByActivoTrue();

    /** Lista paginada de pedidos semana bodega activos con sus detalles agrupados en JSON. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<RecipeWithDetailsView> findAllWithDetailsPaging(
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos para calcular la paginación. */
    long countByActivoTrue();

    /** Lista paginada de pedidos semana bodega activos filtrados por nombre o descripción con detalles en JSON. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true
          AND (p.nombre_pedido_semana_bodega ILIKE %:term% OR p.descripcion_pedido_semana_bodega ILIKE %:term%)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<RecipeWithDetailsView> findAllWithDetailsAndSearch(
            @Param("term") String term,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos filtrados por búsqueda para calcular la paginación. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true
          AND (nombre_pedido_semana_bodega ILIKE %:term% OR descripcion_pedido_semana_bodega ILIKE %:term%)
        """, nativeQuery = true)
    long countWithSearch(@Param("term") String term);

    /** Retorna el conteo de pedidos semana bodega agrupado por estado para mostrar en el dashboard. */
    @Query(value = """
        SELECT
            count(*) AS totalPedidos,
            COUNT(*) FILTER (WHERE estado_pedido = 'ACTIVO') AS total_activos,
            COUNT(*) FILTER (WHERE estado_pedido = 'INACTIVO') AS total_inactivos
        FROM pedido_semana_bodega
        WHERE activo = true
        """, nativeQuery = true)
    CountRecipesAndStatusView countRecipesAndStatus();

    /** Invierte el estado del pedido semana bodega entre ACTIVO e INACTIVO directamente en BD, retorna filas afectadas. */
    @Modifying
    @Query(value = """
        UPDATE pedido_semana_bodega
        SET estado_pedido = (
            CASE
                WHEN estado_pedido = 'ACTIVO' THEN 'INACTIVO'::estado_pedido_semana_bodega
                ELSE 'ACTIVO'::estado_pedido_semana_bodega
            END
        )
        WHERE id_pedido_semana_bodega = :idPedidoSemanaBodega
        """, nativeQuery = true)
    int toggleRecipeStatus(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);


    /** Realiza el borrado lógico de un pedido semana bodega por su ID. */
    @Modifying
    @Query("""
       UPDATE PedidoSemanaBodega p
       SET p.activo = false
       WHERE p.idPedidoSemanaBodega = :idPedidoSemanaBodega
       """)
    int softDeleteRecipeById(@Param("idPedidoSemanaBodega") Integer idPedidoSemanaBodega);



    // ─── BOOLEANOS ───────────────────────────────────────────────────────────────

    /** Verifica si existe un pedido semana bodega activo con el nombre indicado. */
    boolean existsByNombrePedidoAndActivoTrue(String nombrePedido);
    /** Verifica si existe un pedido semana bodega con el ID indicado. */
    boolean existsById(Integer id);




}
