package KuHub.modules.gestion_orden_pedido.repository;

import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DetalleOrdenPedidoRepository extends JpaRepository<DetalleOrdenPedido, Long> {

    // ── 1. Métodos JPA derivados ──

    /** Lista detalles activos de una OP. */
    List<DetalleOrdenPedido> findByOrdenPedido_IdOrdenPedidoAndActivoTrue(Integer idOrdenPedido);

    // ── 3. @Modifying + @Transactional ──

    /** Marca como entregados en bloque los detalles cuyos IDs estén en la lista. Retorna el número de filas actualizadas. */
    @Modifying
    @Transactional
    @Query("UPDATE DetalleOrdenPedido d SET d.entregado = true WHERE d.idDetalleOrdenPedido IN :ids")
    int marcarEntregados(@Param("ids") List<Long> ids);
}
