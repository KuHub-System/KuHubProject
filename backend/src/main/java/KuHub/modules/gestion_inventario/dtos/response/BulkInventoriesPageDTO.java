package KuHub.modules.gestion_inventario.dtos.response;

import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductInventoryBulkView;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class BulkInventoriesPageDTO {
    private List<ProductInventoryBulkView> content;
    private int page;
    private int limit;
    private int totalPages;
    private long totalElements;
}
