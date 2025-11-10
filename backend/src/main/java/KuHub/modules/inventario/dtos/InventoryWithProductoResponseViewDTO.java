package KuHub.modules.inventario.dtos;

import lombok.*;

@Data@NoArgsConstructor@AllArgsConstructor@Getter @Setter
public class InventoryWithProductoResponseViewDTO {
    private String nombreProducto;
    private String nombreCategoria;
    private Double stock;
    private String unidadMedida;
    private Double stockLimitMin;
    private String estadoStock;
}
