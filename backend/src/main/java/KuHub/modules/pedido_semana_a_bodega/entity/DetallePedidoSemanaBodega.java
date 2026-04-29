package KuHub.modules.pedido_semana_a_bodega.entity;

import KuHub.modules.gestion_inventario.entity.Producto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name ="detalle_pedido_semana_bodega", uniqueConstraints = {
        @UniqueConstraint(name = "uk_detalle_pedido_producto", columnNames = {"id_pedido_semana_bodega", "id_producto"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "pedidoSemanaBodega")
public class DetallePedidoSemanaBodega {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle_pedido_semana", nullable = false)
    private Integer idDetallePedidoSemana;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pedido_semana_bodega", nullable = false)
    private PedidoSemanaBodega pedidoSemanaBodega;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "cant_producto", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantProducto;

    public void setPedidoSemanaBodegaById(Integer idPedidoSemanaBodega) {
        this.pedidoSemanaBodega = new PedidoSemanaBodega();
        this.pedidoSemanaBodega.setIdPedidoSemanaBodega(idPedidoSemanaBodega);
    }

    public void setProductoById(Integer idProducto) {
        this.producto = new Producto();
        this.producto.setIdProducto(idProducto);
    }


}
