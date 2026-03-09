package KuHub.modules.gestion_receta.dtos.respose.projection;

import java.math.BigDecimal;

public interface DetailsByUpdateView {
    Integer getIdDetalle();
    Integer getIdProducto();
    BigDecimal getCantidad();
}
