package KuHub.modules.gestion_pedido.repository;

import KuHub.modules.gestion_pedido.entity.PedidoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PedidoSolicitudRepository extends JpaRepository<PedidoSolicitud,Integer> {
}
