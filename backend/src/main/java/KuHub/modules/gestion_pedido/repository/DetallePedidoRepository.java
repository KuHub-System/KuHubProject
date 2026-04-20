package KuHub.modules.gestion_pedido.repository;

import KuHub.modules.gestion_pedido.entity.DetallePedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DetallePedidoRepository extends JpaRepository<DetallePedido, Integer> {

    /** Inserta los productos de una solicitud en el pedido, sumando cantidad si ya existe el producto. */
    @Modifying
    @Query(value = """
        INSERT INTO detalle_pedido (id_pedido, id_producto, cant_producto_pedido)
        SELECT :idPedido, ds.id_producto, ds.cant_producto_solicitud
        FROM detalle_solicitud ds
        WHERE ds.id_solicitud = :idSolicitud
        ON CONFLICT (id_pedido, id_producto)
        DO UPDATE SET cant_producto_pedido = detalle_pedido.cant_producto_pedido + EXCLUDED.cant_producto_pedido
        """, nativeQuery = true)
    void upsertDetallesFromSolicitud(@Param("idPedido") Integer idPedido, @Param("idSolicitud") Integer idSolicitud);
}
