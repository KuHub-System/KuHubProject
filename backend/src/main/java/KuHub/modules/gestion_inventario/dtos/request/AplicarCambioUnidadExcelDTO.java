package KuHub.modules.gestion_inventario.dtos.request;

import java.util.List;

public record AplicarCambioUnidadExcelDTO(List<Item> items) {
    public record Item(
            Integer idProducto,
            Short idUnidadMedida
    ) {}
}
