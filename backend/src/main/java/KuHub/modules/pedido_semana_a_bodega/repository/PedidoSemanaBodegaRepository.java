package KuHub.modules.pedido_semana_a_bodega.repository;

import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountPedidoSemanaBodegaAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.AsignaturaActivaView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.PedidoSemanaBodegaWithDetailsView;
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

    /*
     * Filtro de estado opcional en las consultas paginadas y de búsqueda:
     *   AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
     * Cuando :estadoPedido es NULL devuelve todos (activos + inactivos); cuando trae
     * 'ACTIVO' o 'INACTIVO' filtra ese estado DENTRO de la consulta, evitando que un
     * registro inactivo quede fuera por la paginación (no aparecía nunca si caía más
     * allá de las primeras 20 filas). El CAST explícito es obligatorio para que
     * PostgreSQL pueda inferir el tipo del parámetro cuando llega NULL.
     */

    /** Busca un pedido semana bodega activo por ID. */
    Optional<PedidoSemanaBodega> findByIdPedidoSemanaBodegaAndActivoIsTrue(Integer idPedidoSemanaBodega);

    /** Lista todos los pedidos semana bodega activos sin paginación. */
    List<PedidoSemanaBodega> findAllByActivoTrue();

    /** Lista paginada de pedidos semana bodega activos con sus detalles agrupados en JSON, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsPaging(
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Lista paginada de pedidos semana bodega activos filtrados por idSemana, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true AND p.id_semana = :idSemana
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsPagingByIdSemana(
            @Param("idSemana") Integer idSemana,
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos para calcular la paginación, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countByActivoTrue(@Param("estadoPedido") String estadoPedido);

    /** Cuenta el total de pedidos semana bodega activos filtrados por idSemana, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true AND id_semana = :idSemana
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countByActivoTrueAndIdSemana(@Param("idSemana") Integer idSemana,
                                      @Param("estadoPedido") String estadoPedido);

    /** Lista paginada de pedidos semana bodega activos filtrados por nombre o descripción con detalles en JSON, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true
          AND (p.nombre_pedido_semana_bodega ILIKE %:term% OR p.descripcion_pedido_semana_bodega ILIKE %:term%)
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsAndSearch(
            @Param("term") String term,
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Lista paginada de pedidos semana bodega activos filtrados por búsqueda e idSemana, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true
          AND (p.nombre_pedido_semana_bodega ILIKE %:term% OR p.descripcion_pedido_semana_bodega ILIKE %:term%)
          AND p.id_semana = :idSemana
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsAndSearchByIdSemana(
            @Param("term") String term,
            @Param("idSemana") Integer idSemana,
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos filtrados por búsqueda, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true
          AND (nombre_pedido_semana_bodega ILIKE %:term% OR descripcion_pedido_semana_bodega ILIKE %:term%)
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countWithSearch(@Param("term") String term,
                         @Param("estadoPedido") String estadoPedido);

    /** Cuenta el total de pedidos semana bodega activos filtrados por búsqueda e idSemana, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true
          AND (nombre_pedido_semana_bodega ILIKE %:term% OR descripcion_pedido_semana_bodega ILIKE %:term%)
          AND id_semana = :idSemana
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countWithSearchAndIdSemana(@Param("term") String term,
                                    @Param("idSemana") Integer idSemana,
                                    @Param("estadoPedido") String estadoPedido);

    /** Retorna el conteo de pedidos semana bodega agrupado por estado para mostrar en el dashboard. */
    @Query(value = """
        SELECT
            count(*) AS totalPedidos,
            COUNT(*) FILTER (WHERE estado_pedido = 'ACTIVO') AS total_activos,
            COUNT(*) FILTER (WHERE estado_pedido = 'INACTIVO') AS total_inactivos
        FROM pedido_semana_bodega
        WHERE activo = true
        """, nativeQuery = true)
    CountPedidoSemanaBodegaAndStatusView countRecipesAndStatus();

    /** Invierte el estado del pedido semana bodega entre ACTIVO e INACTIVO directamente en BD, retorna filas afectadas. */
    @Modifying
    @Query(value = """
        UPDATE pedido_semana_bodega
        SET estado_pedido = (
            CASE
                WHEN estado_pedido = 'ACTIVO' THEN 'INACTIVO'
                ELSE 'ACTIVO'
            END
        )::estado_pedido_semana_bodega_type
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



    // ─── QUERIES CON FILTRO POR ASIGNATURA ──────────────────────────────────────

    /** Lista paginada de pedidos semana bodega activos filtrados por idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true AND p.id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsPagingByIdAsignatura(
            @Param("idAsignatura") Integer idAsignatura,
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos filtrados por idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true AND id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countByActivoTrueAndIdAsignatura(@Param("idAsignatura") Integer idAsignatura,
                                          @Param("estadoPedido") String estadoPedido);

    /** Lista paginada de pedidos semana bodega activos filtrados por idSemana e idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true AND p.id_semana = :idSemana AND p.id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsPagingByIdSemanaAndIdAsignatura(
            @Param("idSemana") Integer idSemana,
            @Param("idAsignatura") Integer idAsignatura,
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos filtrados por idSemana e idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true AND id_semana = :idSemana AND id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countByActivoTrueAndIdSemanaAndIdAsignatura(@Param("idSemana") Integer idSemana,
                                                     @Param("idAsignatura") Integer idAsignatura,
                                                     @Param("estadoPedido") String estadoPedido);

    /** Lista paginada de pedidos semana bodega activos filtrados por búsqueda e idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true
          AND (p.nombre_pedido_semana_bodega ILIKE %:term% OR p.descripcion_pedido_semana_bodega ILIKE %:term%)
          AND p.id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsAndSearchByIdAsignatura(
            @Param("term") String term,
            @Param("idAsignatura") Integer idAsignatura,
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos filtrados por búsqueda e idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true
          AND (nombre_pedido_semana_bodega ILIKE %:term% OR descripcion_pedido_semana_bodega ILIKE %:term%)
          AND id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countWithSearchAndIdAsignatura(@Param("term") String term,
                                        @Param("idAsignatura") Integer idAsignatura,
                                        @Param("estadoPedido") String estadoPedido);

    /** Lista paginada de pedidos semana bodega activos filtrados por búsqueda, idSemana e idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT
            p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
            p.nombre_pedido_semana_bodega AS "nombrePedido",
            p.descripcion_pedido_semana_bodega AS "descripcionPedido",
            p.estado_pedido::text AS "estadoPedido",
            COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
            p.id_semana AS "idSemana",
            p.id_asignatura AS "idAsignatura",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', pr.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetallePedido', d.id_detalle_pedido_semana,
                    'idProducto', pr.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) AS "detallesJson"
        FROM pedido_semana_bodega p
        LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
        LEFT JOIN producto pr ON d.id_producto = pr.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
        WHERE p.activo = true
          AND (p.nombre_pedido_semana_bodega ILIKE %:term% OR p.descripcion_pedido_semana_bodega ILIKE %:term%)
          AND p.id_semana = :idSemana
          AND p.id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR p.estado_pedido::text = :estadoPedido)
        GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
        ORDER BY p.nombre_pedido_semana_bodega ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura(
            @Param("term") String term,
            @Param("idSemana") Integer idSemana,
            @Param("idAsignatura") Integer idAsignatura,
            @Param("estadoPedido") String estadoPedido,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de pedidos semana bodega activos filtrados por búsqueda, idSemana e idAsignatura, filtrable por estado. */
    @Query(value = """
        SELECT COUNT(*) FROM pedido_semana_bodega
        WHERE activo = true
          AND (nombre_pedido_semana_bodega ILIKE %:term% OR descripcion_pedido_semana_bodega ILIKE %:term%)
          AND id_semana = :idSemana
          AND id_asignatura = :idAsignatura
          AND (CAST(:estadoPedido AS text) IS NULL OR estado_pedido::text = :estadoPedido)
        """, nativeQuery = true)
    long countWithSearchAndIdSemanaAndIdAsignatura(@Param("term") String term,
                                                   @Param("idSemana") Integer idSemana,
                                                   @Param("idAsignatura") Integer idAsignatura,
                                                   @Param("estadoPedido") String estadoPedido);

    /** Obtiene todas las asignaturas activas para el selector del modal. */
    @Query(value = """
        SELECT
            a.id_asignatura    AS idAsignatura,
            a.nombre_asignatura AS nombreAsignatura,
            a.cod_asignatura    AS codAsignatura
        FROM asignatura a
        WHERE a.activo = TRUE
        ORDER BY a.nombre_asignatura ASC
        """, nativeQuery = true)
    List<AsignaturaActivaView> findAllAsignaturasActivas();


    // ─── BOOLEANOS ───────────────────────────────────────────────────────────────

    /** Verifica si existe un pedido semana bodega activo con el nombre indicado. */
    boolean existsByNombrePedidoAndActivoTrue(String nombrePedido);
    /** Verifica si existe un pedido semana bodega con el ID indicado. */
    boolean existsById(Integer id);




}
