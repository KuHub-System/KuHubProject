package KuHub.modules.gestion_orden_pedido.repository;

import KuHub.modules.gestion_orden_pedido.entity.ReservaStockSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de {@link ReservaStockSolicitud}. Persiste las reservas de stock cubierto por
 * solicitud (upsert por la clave única solicitud+producto).
 */
@Repository
public interface ReservaStockSolicitudRepository
        extends JpaRepository<ReservaStockSolicitud, Integer> {

    /** Reserva existente para un par (solicitud, producto), si la hay. */
    Optional<ReservaStockSolicitud> findByIdSolicitudAndIdProducto(Integer idSolicitud, Integer idProducto);

    /** Reservas existentes para una lista de solicitudes. */
    @Query("SELECT r FROM ReservaStockSolicitud r WHERE r.idSolicitud IN :idsSolicitudes AND r.activo = true")
    List<ReservaStockSolicitud> findByIdSolicitudInAndActivoTrue(@Param("idsSolicitudes") List<Integer> idsSolicitudes);

    /** Desactiva (activo=false) todas las reservas de una solicitud. Usado al rechazar la solicitud. */
    @Modifying
    @Transactional
    @Query("UPDATE ReservaStockSolicitud r SET r.activo = false WHERE r.idSolicitud = :idSolicitud AND r.activo = true")
    int desactivarByIdSolicitud(@Param("idSolicitud") Integer idSolicitud);
}
