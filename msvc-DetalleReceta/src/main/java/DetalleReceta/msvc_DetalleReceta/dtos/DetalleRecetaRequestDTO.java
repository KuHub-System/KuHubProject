package DetalleReceta.msvc_DetalleReceta.dtos;

import lombok.*;

@Getter
@Setter
@ToString
@AllArgsConstructor@NoArgsConstructor
public class DetalleRecetaRequestDTO {

    private String nombreReceta;
    private Long idProducto;
    private float cantidadProducto;
}
