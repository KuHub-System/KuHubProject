package DetalleReceta.msvc_DetalleReceta.models;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString

public class Producto {


    private Long idProducto;

    private String nombreProducto;

    private String unidadMedida;

    private Categoria categoria;

}
