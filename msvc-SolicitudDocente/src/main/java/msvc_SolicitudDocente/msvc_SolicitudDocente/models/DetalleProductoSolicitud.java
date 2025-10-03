package msvc_SolicitudDocente.msvc_SolicitudDocente.models;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleProductoSolicitud {

    private Long    idDetalleProductoSolicitud;

    private Long    idSolicitudDocente;

    private Long    idProducto;

    private Float cantidadDetalleSolicitud;
}
