package msvc_Movimiento.model;

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

    public Producto(String nombreProducto, String unidadMedida) {
        this.nombreProducto = nombreProducto;
        this.unidadMedida = unidadMedida;

    }


}
