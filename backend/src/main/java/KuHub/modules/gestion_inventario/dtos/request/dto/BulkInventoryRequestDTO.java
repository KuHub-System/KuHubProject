package KuHub.modules.gestion_inventario.dtos.request.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkInventoryRequestDTO {
    private String searchTerm; // Opcional
    private Integer page;      // Para la paginación 20/10
}