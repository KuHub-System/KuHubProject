package KuHub.modules.gestion_orden_pedido.repository;

import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetalleOrdenPedidoRepository extends JpaRepository<DetalleOrdenPedido, Long> {

    // ── 1. Métodos JPA derivados ──

    /** Lista detalles activos de una OP. */
    List<DetalleOrdenPedido> findByOrdenPedido_IdOrdenPedidoAndActivoTrue(Integer idOrdenPedido);
}
