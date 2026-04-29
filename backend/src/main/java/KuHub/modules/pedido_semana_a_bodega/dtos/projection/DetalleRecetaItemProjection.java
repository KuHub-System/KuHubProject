package KuHub.modules.pedido_semana_a_bodega.dtos.projection;

import java.math.BigDecimal;

public interface DetalleRecetaItemProjection {
    Integer getIdProducto();
    String getNombreProducto();
    BigDecimal getCantProducto();
    String getUnidadMedida();
    Boolean getActivo();
}
