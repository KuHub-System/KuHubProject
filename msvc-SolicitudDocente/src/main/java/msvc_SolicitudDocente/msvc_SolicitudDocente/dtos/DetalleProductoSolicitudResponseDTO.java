package msvc_SolicitudDocente.msvc_SolicitudDocente.dtos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleProductoSolicitudResponseDTO {

    private Long idDetalleProductoSolicitud;
    @JsonIgnore
    private Long idSolicitudDocente;
    @JsonIgnore
    private Long idProducto;
    private String nombreProducto;
    private String unidadMedida;
    private Float cantidadDetalleSolicitud;

}
