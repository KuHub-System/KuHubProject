package KuHub.modules.gestion_receta.dtos.projection;

import java.math.BigDecimal;

public interface DetalleRecetaItemProjection {
    Integer getIdProducto();
    String getNombreProducto();
    BigDecimal getCantProducto();
    String getUnidadMedida();
    Boolean getActivo();
}
