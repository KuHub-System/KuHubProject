package KuHub.modules.gestion_orden_compra.repository;

import KuHub.modules.gestion_orden_compra.entity.DetalleOrdenCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetalleOrdenCompraRepository extends JpaRepository<DetalleOrdenCompra, Long> {

    // ── 1. Métodos JPA derivados ──

    /** Lista detalles activos de una OC. */
    List<DetalleOrdenCompra> findByOrdenCompra_IdOrdenCompraAndActivoTrue(Integer idOrdenCompra);
}
