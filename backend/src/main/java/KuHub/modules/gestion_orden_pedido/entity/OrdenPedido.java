package KuHub.modules.gestion_orden_pedido.entity;

import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;
import KuHub.modules.gestion_pedido.entity.Pedido;
import KuHub.modules.gestion_proveedor.entity.Proveedor;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad JPA que representa una Orden de Pedido en el sistema.
 * Vincula un pedido consolidado semanal con el proveedor seleccionado para realizar la compra.
 * Almacena el estado del flujo de aprobación de la orden, observaciones generales
 * y contiene la lista de detalles de productos y entregas asociados.
 */
@Entity
@Table(name = "orden_pedido")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "detalles")
public class OrdenPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_orden_pedido")
    private Integer idOrdenPedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_pedido", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_proveedor", nullable = false)
    private Proveedor proveedor;

    @Column(name = "fecha_creacion", nullable = false, updatable = false,
            columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_orden_pedido", nullable = false)
    private EstadoOrdenPedido estadoOrdenPedido = EstadoOrdenPedido.PENDIENTE;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @OneToMany(mappedBy = "ordenPedido", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<DetalleOrdenPedido> detalles = new ArrayList<>();

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
