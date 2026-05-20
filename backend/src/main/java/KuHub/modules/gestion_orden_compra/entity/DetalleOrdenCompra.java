package KuHub.modules.gestion_orden_compra.entity;

import KuHub.modules.gestion_inventario.entity.Producto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Mapea tabla detalle_orden_compra (Tarea #13). Snapshot de precios al momento de crear la OC. */
@Entity
@Table(name = "detalle_orden_compra")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleOrdenCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle_orden_compra")
    private Long idDetalleOrdenCompra;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_orden_compra", nullable = false)
    private OrdenCompra ordenCompra;

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

    public void setIdOrdenCompra(Integer id) {
        if (id != null) {
            this.ordenCompra = new OrdenCompra();
            this.ordenCompra.setIdOrdenCompra(id);
        }
    }

    public void setIdProducto(Integer id) {
        if (id != null) {
            this.producto = new Producto();
            this.producto.setIdProducto(id);
        }
    }
}
