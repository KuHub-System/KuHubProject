package KuHub.modules.inventario.dtos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Data@NoArgsConstructor@AllArgsConstructor@Getter @Setter
public class InventoryWithProductoResponseDTO {

    private Integer idInventario;
    private Integer idProducto;
    private String nombreProducto;
    private String nombreCategoria;
    private Double stock;
    private Double stockLimitMin;
    private String unidadMedida;
    private String estadoStock;
}
