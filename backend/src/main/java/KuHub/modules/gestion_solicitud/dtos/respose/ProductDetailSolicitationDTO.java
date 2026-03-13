package KuHub.modules.gestion_solicitud.dtos.respose;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductDetailSolicitationDTO {
    private String nombreProducto;
    private BigDecimal cantidad;
    private String unidad;
}
