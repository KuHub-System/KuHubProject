package KuHub.modules.gestion_orden_pedido.repository;

import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedidoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de la puente {@link DetalleOrdenPedidoSolicitud}.
 * Persiste y consulta el vínculo línea de entrega ↔ solicitud abastecida.
 */
@Repository
public interface DetalleOrdenPedidoSolicitudRepository
        extends JpaRepository<DetalleOrdenPedidoSolicitud, Integer> {

    /** Vínculos activos de una línea de detalle de OP. */
    List<DetalleOrdenPedidoSolicitud> findByIdDetalleOrdenPedidoAndActivoTrue(Integer idDetalleOrdenPedido);
}
