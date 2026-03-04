package KuHub.modules.gestion_inventario.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WarehousePageDTO {
    // IDs principales
    private Integer idBodegaTransito;
    private Integer idInventario;
    private Integer idProducto;

    // Datos del Producto
    private String nombreProducto;
    private String codProducto;
    private String descripcionProducto;

    // Datos de la Categoría
    private Integer idCategoria;
    private String nombreCategoria;

    // Datos de la Unidad
    private Integer idUnidad;
    private String nombreUnidad;
    private Boolean esFraccionario;

    // Datos de Stock (en tránsito)
    private BigDecimal stock;
    private BigDecimal stockLimit;
}
