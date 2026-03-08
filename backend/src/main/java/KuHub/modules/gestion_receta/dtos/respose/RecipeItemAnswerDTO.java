package KuHub.modules.gestion_receta.dtos.respose;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonPropertyOrder({
        "nombreProducto",
        "cantProducto",
        "abreviatura",
        "idDetalleReceta",
        "idProducto",
        "idUnidad"
})
public class RecipeItemAnswerDTO {
    private String nombreProducto;
    private BigDecimal cantProducto;
    private String abreviatura;
    private Integer idDetalleReceta;
    private Integer idProducto;
    private Integer idUnidad;
}