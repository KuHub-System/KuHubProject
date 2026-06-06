package KuHub.modules.gestion_pedido.repository;

import KuHub.modules.gestion_pedido.entity.PedidoSolicitud;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoSolicitudRepository extends JpaRepository<PedidoSolicitud,Integer> {

    /** Retorna el idPedido asociado a una solicitud dada. */
    @Query("SELECT ps.pedido.idPedido FROM PedidoSolicitud ps WHERE ps.solicitud.idSolicitud = :idSolicitud")
    Optional<Integer> findIdPedidoByIdSolicitud(@Param("idSolicitud") Integer idSolicitud);

    /** Vincula una solicitud a un pedido; ignora si ya existe el vínculo. */
    @Modifying
    @Query(value = "INSERT INTO pedido_solicitud (id_pedido, id_solicitud) VALUES (:idPedido, :idSolicitud) ON CONFLICT DO NOTHING", nativeQuery = true)
    void insertIfNotExists(@Param("idPedido") Integer idPedido, @Param("idSolicitud") Integer idSolicitud);

    /** Elimina el vínculo entre una solicitud y su pedido (al rechazar una solicitud EN_PEDIDO). */
    @Modifying
    @Query(value = "DELETE FROM pedido_solicitud WHERE id_pedido = :idPedido AND id_solicitud = :idSolicitud", nativeQuery = true)
    void deleteVinculo(@Param("idPedido") Integer idPedido, @Param("idSolicitud") Integer idSolicitud);

    /** Cuenta solicitudes vinculadas a un pedido cuyo estado NO es PROCESADO. */
    @Query(value = """
        SELECT COUNT(*)
        FROM pedido_solicitud ps
        JOIN solicitud s ON s.id_solicitud = ps.id_solicitud
        WHERE ps.id_pedido = :idPedido
          AND s.estado_solicitud != 'PROCESADO'
        """, nativeQuery = true)
    Long countSolicitudesNoProcesadas(@Param("idPedido") Integer idPedido);

    /**
     * Retorna (fecha_solicitada, id_producto, cant_producto_solicitud) de todas las
     * solicitudes EN_PEDIDO vinculadas al pedido, ordenadas por fecha. Usado para calcular
     * las porciones de solicitud en las observaciones del Excel de Órdenes de Pedido.
     *   [0] fecha_solicitada  (java.sql.Date → LocalDate)
     *   [1] id_producto       (Integer)
     *   [2] cant_producto_solicitud (BigDecimal)
     */
    @Query(value = """
        SELECT
            s.fecha_solicitada,           -- [0]
            ds.id_producto,               -- [1]
            ds.cant_producto_solicitud    -- [2]
        FROM pedido_solicitud ps
        JOIN solicitud s ON s.id_solicitud = ps.id_solicitud
        JOIN detalle_solicitud ds ON ds.id_solicitud = s.id_solicitud
        WHERE ps.id_pedido = :idPedido
          AND s.estado_solicitud = 'EN_PEDIDO'
        ORDER BY s.fecha_solicitada ASC
        """, nativeQuery = true)
    List<Object[]> findSolicitudDetallesByPedido(@Param("idPedido") Integer idPedido);

}
