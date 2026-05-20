package KuHub.modules.gestion_orden_compra.entity;

import KuHub.modules.gestion_pedido.entity.Pedido;
import KuHub.modules.gestion_proveedor.entity.Proveedor;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Mapea tabla orden_compra (Tarea #13). Vincula un pedido con un proveedor. */
@Entity
@Table(name = "orden_compra")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "detalles")
public class OrdenCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_orden_compra")
    private Integer idOrdenCompra;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pedido", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proveedor", nullable = false)
    private Proveedor proveedor;

    @Column(name = "fecha_creacion", nullable = false, updatable = false,
            columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @OneToMany(mappedBy = "ordenCompra", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<DetalleOrdenCompra> detalles = new ArrayList<>();

    public void setIdPedido(Integer id) {
        if (id != null) {
            this.pedido = new Pedido();
            this.pedido.setIdPedido(id);
        }
    }

    public void setIdProveedor(Integer id) {
        if (id != null) {
            this.proveedor = new Proveedor();
            this.proveedor.setIdProveedor(id);
        }
    }
}
