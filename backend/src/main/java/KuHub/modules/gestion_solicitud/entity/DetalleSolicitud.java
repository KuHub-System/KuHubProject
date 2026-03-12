package KuHub.modules.gestion_solicitud.entity;

import KuHub.modules.gestion_inventario.entity.Producto;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "detalle_solicitud")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DetalleSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle_solicitud")
    private Integer idDetalleSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "id_solicitud", referencedColumnName = "id_solicitud", nullable = false),
        @JoinColumn(name = "fecha_solicitada", referencedColumnName = "fecha_solicitada", nullable = false)
    })
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "cant_producto_solicitud", nullable = false, precision = 10, scale = 3)
    private BigDecimal cantProductoSolicitud;

    @Column(name = "observacion", length = 100)
    private String observacion;

    // ----------- Métodos Helper para asignación por ID -----------

    public void setIdProducto(Integer id) {
        if (id != null) {
            this.producto = new Producto();
            this.producto.setIdProducto(id);
        }
    }
}
