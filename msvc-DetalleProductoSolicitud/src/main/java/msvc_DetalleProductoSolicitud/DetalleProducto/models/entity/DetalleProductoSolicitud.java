package msvc_DetalleProductoSolicitud.DetalleProducto.models.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name ="detalle_producto_solicitud")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleProductoSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name =  "id_detalle_producto_solicitud",nullable = false,unique = true)
    private Long    idDetalleProductoSolicitud;

    @Column(name=   "id_solicitud_docente",nullable = false)
    @NotNull(message = "El campo id solicitud docente no puede ser vacio")
    private Long    idSolicitudDocente;

    @Column(name=   "id_producto",nullable = false)
    @NotNull(message = "El campo id producto no puede ser vacio")
    private Long    idProducto;

    @Column(name = "cantidad_unidad_medida")
    @NotNull(message = "El campo id cantidad unidad medida no puede ser vacio")
    private Float cantidadDetalleSolicitud;
}
