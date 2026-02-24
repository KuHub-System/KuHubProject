package KuHub.modules.gestion_inventario.dtos.request.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FilterInventoryPageDTO {

    // filtros múltiples
    private List<Integer> categoriasIds;
    private List<Integer> unidadesIds;

    // stock bajo
    private Boolean soloStockBajo;

    // paginación
    private Integer page;      // 1..n
    private Integer pageSize;  // opcional (default 20)
}
