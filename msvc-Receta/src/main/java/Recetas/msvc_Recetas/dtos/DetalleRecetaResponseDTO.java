package Recetas.msvc_Recetas.dtos;


import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleRecetaResponseDTO {

    @JsonIgnore
    private Long idDetalleReceta;
    @JsonIgnore
    private Long idReceta;
    @JsonIgnore
    private Long idProducto;

    private String nombreProducto;

    private String unidadMedida;

    private Float cantidadDetalleReceta;


}
