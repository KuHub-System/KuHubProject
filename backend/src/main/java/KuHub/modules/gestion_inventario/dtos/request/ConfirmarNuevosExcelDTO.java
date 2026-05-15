package KuHub.modules.gestion_inventario.dtos.request;

import java.math.BigDecimal;
import java.util.List;

public record ConfirmarNuevosExcelDTO(List<ItemNuevo> items) {
    public record ItemNuevo(
            String nombre,
            Short idUnidadMedida,
            BigDecimal stock,
            Short idCategoria
    ) {}
}
