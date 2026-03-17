package KuHub.modules.gestion_pedido.repository;

import KuHub.modules.gestion_pedido.entity.DetallePedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DetallePedidoRepository extends JpaRepository< DetallePedido,Integer> {
}
