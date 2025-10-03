package DetalleReceta.msvc_DetalleReceta.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DetalleRecetaIUpdateQuantityRequestDTO {

    @NotNull(message = "El campo cantidad no puede ser vacio")
    private Float cantidadDetalleReceta;
}
