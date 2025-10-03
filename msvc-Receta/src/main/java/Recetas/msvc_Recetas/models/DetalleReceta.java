package Recetas.msvc_Recetas.models;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class DetalleReceta {

    private Long idDetalleReceta;

    private Long idReceta;

    private Long idProducto;

    private Float cantidadDetalleReceta;
}
