package KuHub.modules.gestion_orden_pedido.repository;

import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

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

    /** Retorna los IDs de OrdenPedido distintos a los que pertenecen los detalles indicados. */
    @Query("SELECT DISTINCT d.ordenPedido.idOrdenPedido FROM DetalleOrdenPedido d WHERE d.idDetalleOrdenPedido IN :ids")
    Set<Integer> findOrdenPedidoIdsByDetalleIds(@Param("ids") List<Long> ids);
}
