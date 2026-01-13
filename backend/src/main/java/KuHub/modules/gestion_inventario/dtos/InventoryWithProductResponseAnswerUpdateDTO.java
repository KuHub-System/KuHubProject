package KuHub.modules.gestion_inventario.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data@NoArgsConstructor@AllArgsConstructor@Getter @Setter
public class InventoryWithProductResponseAnswerUpdateDTO {
    @NotNull
    private  Integer idInventario;
    @NotNull
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
