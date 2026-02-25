package KuHub.modules.gestion_inventario.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InventoriesPageDTO {
    private List<InventoryPageDTO> data;
    private Integer page;
    private Integer pageSize;
    private Integer totalPaginas;
    private Long totalRegistros;
}
