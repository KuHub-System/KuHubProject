package KuHub.modules.gestion_inventario.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FilterInventoryPageDTO {

    // Filtros múltiples
    private List<Integer> categoriasIds;
    private List<Integer> unidadesIds;

    // Filtros de Stock
    private Boolean soloStockBajo;
    private Boolean ocultarAgotados;

    // Ordenamiento
    private Boolean isAsc;
    private Boolean isDesc;

    // Paginación
    private Integer page;
    private Integer pageSize;  // opcional (default 20)
}
