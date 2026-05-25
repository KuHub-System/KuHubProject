package KuHub.modules.gestion_orden_pedido.entity;

import KuHub.modules.gestion_inventario.entity.Producto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Mapea tabla detalle_orden_pedido (Tarea #13). Snapshot de precios al momento de crear la OP. */
@Entity
@Table(name = "detalle_orden_pedido")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleOrdenPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle_orden_pedido")
    private Long idDetalleOrdenPedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_orden_pedido", nullable = false)
    private OrdenPedido ordenPedido;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "cantidad_solicitada", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidadSolicitada;

    @Column(name = "precio_neto_unitario", precision = 10, scale = 3)
    private BigDecimal precioNetoUnitario;

    @Column(name = "precio_con_iva_unitario", precision = 10, scale = 3)
    private BigDecimal precioConIvaUnitario;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    public void setIdOrdenPedido(Integer id) {
        if (id != null) {
            this.ordenPedido = new OrdenPedido();
            this.ordenPedido.setIdOrdenPedido(id);
        }
    }

    public void setIdProducto(Integer id) {
        if (id != null) {
            this.producto = new Producto();
            this.producto.setIdProducto(id);
        }
    }
}
