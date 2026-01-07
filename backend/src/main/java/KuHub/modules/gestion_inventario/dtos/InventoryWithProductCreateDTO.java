package KuHub.modules.gestion_inventario.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter@Setter@ToString@NoArgsConstructor@AllArgsConstructor
public class InventoryWithProductCreateDTO {

    private  Integer idInventario;
    private  Integer idProducto;
    @NotBlank
    private  String nombreProducto;
    private  String descripcionProducto;
    @NotBlank
    private  String nombreCategoria;
    @NotBlank
    private  String unidadMedida;
    @NotNull
    private  Double stock;
    @NotNull
    private  Double stockLimitMin;
}
