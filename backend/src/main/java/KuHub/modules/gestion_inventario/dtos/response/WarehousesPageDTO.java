package KuHub.modules.gestion_inventario.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WarehousesPageDTO {
    private List<WarehousePageDTO> data;
    private Integer page;
    private Integer pageSize;
    private Integer totalPaginas;
    private Long totalRegistros;
}
