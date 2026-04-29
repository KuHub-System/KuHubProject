package KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection;

import java.math.BigDecimal;

public interface DetailsByUpdateView {
    Integer getIdDetalle();
    Integer getIdProducto();
    BigDecimal getCantidad();
}
