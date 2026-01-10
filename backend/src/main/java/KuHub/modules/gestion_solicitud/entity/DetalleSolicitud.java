package KuHub.modules.gestion_solicitud.entity;

import KuHub.modules.producto.entity.Producto;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "detalle_solicitud")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DetalleSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idDetalleSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_solicitud", nullable = false)
    private Solicitud solicitud;

    @Column(name = "id_producto", nullable = false)
    private Integer idProducto;

    @Column(name = "cant_producto_solicitud", nullable = false)
    private Double cantProductoSolicitud;

    @Column(length = 100)
    private String observacion;
}
