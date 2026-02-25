package KuHub.modules.gestion_inventario.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InventoryPageDTO {
    private Integer idInventario;
    private Integer idProducto;
    private String nombreProducto;

    private Integer idCategoria;
    private String nombreCategoria;

    private Integer idUnidad;
    private String nombreUnidad;

    private BigDecimal stock;
    private BigDecimal stockLimit;
}
