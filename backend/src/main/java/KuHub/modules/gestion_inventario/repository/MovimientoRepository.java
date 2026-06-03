package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.Movimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimientoRepository extends JpaRepository<Movimiento, Integer> {

    /** Lista paginada de movimientos con filtros dinámicos: fecha, producto, tipo, orden y responsable. */
    @Query(value = "SELECT " +
            "    p.nombre_producto, " +          // [0]
            "    c.nombre_categoria, " +          // [1]
            "    CAST(m.tipo_movimiento AS TEXT), " + // [2]
            "    m.stock_movimiento, " +          // [3]
            "    m.fecha_movimiento, " +          // [4]
            "    CONCAT_WS(' ', u.p_nombre, u.s_nombre, u.app_paterno, u.app_materno), " + // [5]
            "    m.observacion, " +               // [6]
            "    m.id_solicitud, " +              // [7]
            "    m.id_pedido, " +                 // [8]
            "    m.id_orden_pedido " +            // [9]
            "FROM movimiento m " +
            "JOIN inventario i ON i.id_inventario = m.id_inventario " +
            "JOIN producto p ON p.id_producto = i.id_producto " +
            "JOIN categoria c ON c.id_categoria = p.id_categoria " +
            "JOIN usuario u ON u.id_usuario = m.id_usuario " +
            "WHERE m.fecha_movimiento BETWEEN :fechaInicio AND :fechaFin " +
            "    AND (:nombreProducto IS NULL OR :nombreProducto = '' OR LOWER(p.nombre_producto) LIKE LOWER('%' || :nombreProducto || '%')) " +
            "    AND (:tipoMovimiento IS NULL OR :tipoMovimiento = '' OR CAST(m.tipo_movimiento AS TEXT) = :tipoMovimiento) " +
            "    AND (:nombreResponsable IS NULL OR :nombreResponsable = '' OR LOWER(CONCAT_WS(' ', u.p_nombre, u.s_nombre, u.app_paterno, u.app_materno)) LIKE LOWER('%' || :nombreResponsable || '%')) " +
            "ORDER BY " +
            "    CASE WHEN :orden = 'MAS_RECIENTES' THEN m.fecha_movimiento END DESC, " +
            "    CASE WHEN :orden = 'MAS_ANTIGUOS' THEN m.fecha_movimiento END ASC, " +
            "    CASE WHEN :orden = 'MENOR_CANTIDAD' THEN m.stock_movimiento END ASC, " +
                "CASE WHEN :orden = 'MAYOR_CANTIDAD' THEN m.stock_movimiento END DESC " +
                " LIMIT :limit OFFSET :offset",
                 nativeQuery = true)
    List<Object[]> findDynamicMovements(
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin,
            @Param("nombreProducto") String nombreProducto,
            @Param("tipoMovimiento") String tipoMovimiento,
            @Param("orden") String orden,
            @Param("nombreResponsable") String nombreResponsable,
            @Param("limit") int limit,
            @Param("offset") int offset
    );


    /** Retorna las entregas reales (ENTRADA_INVENTARIO / ENTRADA_BODEGA) de una OP, agrupadas por detalle (línea/fecha exacta). */
    @Query(value = """
        SELECT
            m.id_detalle_orden_pedido,
            SUM(CASE WHEN m.tipo_movimiento::text = 'ENTRADA_INVENTARIO' THEN m.stock_movimiento ELSE 0 END) AS cant_inventario,
            SUM(CASE WHEN m.tipo_movimiento::text = 'ENTRADA_BODEGA'      THEN m.stock_movimiento ELSE 0 END) AS cant_bodega
        FROM movimiento m
        WHERE m.id_orden_pedido = :idOrdenPedido
          AND m.id_detalle_orden_pedido IS NOT NULL
          AND m.tipo_movimiento::text IN ('ENTRADA_INVENTARIO', 'ENTRADA_BODEGA')
        GROUP BY m.id_detalle_orden_pedido
        HAVING SUM(m.stock_movimiento) > 0
        """, nativeQuery = true)
    List<Object[]> findEntregasRealesByOrdenPedido(@Param("idOrdenPedido") Integer idOrdenPedido);

    /** Cuenta el total de movimientos según los mismos filtros dinámicos para calcular la paginación. */
    @Query(value = "SELECT COUNT(*) FROM movimiento m " +
            "JOIN inventario i ON i.id_inventario = m.id_inventario " +
            "JOIN producto p ON p.id_producto = i.id_producto " +
            "JOIN usuario u ON u.id_usuario = m.id_usuario " +
            "WHERE m.fecha_movimiento BETWEEN :inicio AND :fin " +
            "AND (:producto IS NULL OR LOWER(p.nombre_producto) LIKE LOWER('%' || :producto || '%')) " +
            "AND (:tipo IS NULL OR CAST(m.tipo_movimiento AS TEXT) = :tipo) " +
            "AND (:responsable IS NULL OR LOWER(CONCAT_WS(' ', u.p_nombre, u.s_nombre, u.app_paterno, u.app_materno)) LIKE LOWER('%' || :responsable || '%'))",
            nativeQuery = true)
    long countDynamicMovements(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin,
                               @Param("producto") String producto, @Param("tipo") String tipo,
                               @Param("responsable") String responsable);


}
