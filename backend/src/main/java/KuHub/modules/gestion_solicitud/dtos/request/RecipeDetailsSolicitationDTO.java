package KuHub.modules.gestion_solicitud.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipeDetailsSolicitationDTO {
    @JsonProperty("nombreProducto")
    private String nombreProducto;

    @JsonProperty("cantProducto")
    private BigDecimal cantProducto;

    @JsonProperty("abreviatura")
    private String abreviatura;

    @JsonProperty("esFraccionario")
    private Boolean esFraccionario;

    @JsonProperty("activoProducto")
    private Boolean activoProducto;

    @JsonProperty("idDetalleReceta")
    private Integer idDetalleReceta;

    @JsonProperty("idProducto")
    private Integer idProducto;

    @JsonProperty("idUnidad")
    private Short idUnidad;
}
