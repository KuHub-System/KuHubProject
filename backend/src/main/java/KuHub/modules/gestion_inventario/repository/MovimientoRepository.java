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

    @Query(value = "SELECT " +
            "    m.id_movimiento, " +
            "    p.nombre_producto, " +
            "    p.nombre_categoria, " +
            "    CAST(m.tipo_movimiento AS TEXT), " +
            "    m.stock_movimiento, " +
            "    m.fecha_movimiento, " +
            "    (u.p_nombre || ' ' || u.app_paterno), " +
            "    m.observacion " +
            "FROM movimiento m " +
            "JOIN inventario i ON i.id_inventario = m.id_inventario " +
            "JOIN producto p ON p.id_producto = i.id_producto " +
            "JOIN usuario u ON u.id_usuario = m.id_usuario " +
            "WHERE m.fecha_movimiento BETWEEN :fechaInicio AND :fechaFin " +
            "    AND (:nombreProducto IS NULL OR LOWER(p.nombre_producto) LIKE LOWER('%' || :nombreProducto || '%')) " +
            "    AND (:tipoMovimiento IS NULL OR CAST(m.tipo_movimiento AS TEXT) = :tipoMovimiento) " +
            "ORDER BY " +
            "    CASE WHEN :orden = 'MAS_RECIENTES' THEN m.fecha_movimiento END DESC, " +
            "    CASE WHEN :orden = 'MAS_ANTIGUOS' THEN m.fecha_movimiento END ASC, " +
            "    CASE WHEN :orden = 'MENOR_CANTIDAD' THEN m.stock_movimiento END ASC, " +
            "    CASE WHEN :orden = 'MAYOR_CANTIDAD' THEN m.stock_movimiento END DESC",
            nativeQuery = true)
    List<Object[]> buscarMovimientosDinamico(
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin,
            @Param("nombreProducto") String nombreProducto,
            @Param("tipoMovimiento") String tipoMovimiento,
            @Param("orden") String orden
    );


}
