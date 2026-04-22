package KuHub.modules.gestion_pedido.repository;

import KuHub.modules.gestion_pedido.entity.PedidoSolicitud;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    /** Cuenta solicitudes vinculadas a un pedido cuyo estado NO es PROCESADO. */
    @Query(value = """
        SELECT COUNT(*)
        FROM pedido_solicitud ps
        JOIN solicitud s ON s.id_solicitud = ps.id_solicitud
        WHERE ps.id_pedido = :idPedido
          AND s.estado_solicitud != 'PROCESADO'
        """, nativeQuery = true)
    Long countSolicitudesNoProcesadas(@Param("idPedido") Integer idPedido);

}
