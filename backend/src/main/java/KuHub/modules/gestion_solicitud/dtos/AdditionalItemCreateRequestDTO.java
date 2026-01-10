package KuHub.modules.gestion_solicitud.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class AdditionalItemCreateRequestDTO {

    @NotNull
    private Integer idProducto;
    @NotNull
    private Double cantidadAdicional;
}
