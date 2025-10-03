package msvc_DetalleProductoSolicitud.DetalleProducto.dtos;


import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter@Setter@AllArgsConstructor@NoArgsConstructor@ToString
public class DetalleProductoSolicitudUpdateQuantityRequestDTO {

    @NotNull(message = "El campo id cantidad unidad medida no puede ser vacio")
    private Float cantidadDetalleSolicitud;
}
