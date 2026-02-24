package KuHub.modules.gestion_inventario.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InventoryFiltersDTO {
    private List<SimpleFilterDTO> categorias;
    private List<SimpleFilterDTO> unidades;
}
