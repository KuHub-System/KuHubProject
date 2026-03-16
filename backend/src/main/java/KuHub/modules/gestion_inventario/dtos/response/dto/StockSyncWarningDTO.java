package KuHub.modules.gestion_inventario.dtos.response.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StockSyncWarningDTO {
    private String warning;
    private Object item;
}
