package msvc_Inventario.dtos;


import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import msvc_Inventario.models.Categoria;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class InventarioDTO {

    private Long idInventario;
    private String nombreProducto;
    private String unidadMedida;
    private String ubicacionInventario;
    private Float totalInventario;
    @JsonIgnore
    private Float inicialInventario;
    @JsonIgnore
    private Float devolucionInventario;
    private Categoria categoria;


}
