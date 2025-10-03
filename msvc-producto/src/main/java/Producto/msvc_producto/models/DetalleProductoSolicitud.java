package Producto.msvc_producto.models;

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

    private Integer cantidadDetalleSolicitud;
}
