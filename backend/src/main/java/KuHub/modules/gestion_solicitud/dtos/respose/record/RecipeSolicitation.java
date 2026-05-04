package KuHub.modules.gestion_solicitud.dtos.respose.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO Maestro para la respuesta de recetas activas con detalles.
 *
 * Reemplaza los archivos individuales:
 *   - RecipeSolicitationDTO
 *   - RecipeDetailsSolicitationDTO
 */
public record RecipeSolicitation(
        Integer idReceta,
        String nombreReceta,
        Integer idSemana,
        List<RecipeDetailsDTO> detalles
) {

    // ============================================================================
    // 1. DETALLE DE RECETA — parseado desde row[2] (JSONB)
    //    SQL genera: 'nombreProducto', 'cantProducto', 'abreviatura',
    //                'esFraccionario', 'activoProducto', 'idDetalleReceta',
    //                'idProducto', 'idUnidad' (camelCase)
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RecipeDetailsDTO(
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantProducto") BigDecimal cantProducto,
            @JsonProperty("abreviatura") String abreviatura,
            @JsonProperty("esFraccionario") Boolean esFraccionario,
            @JsonProperty("activoProducto") Boolean activoProducto,
            @JsonProperty("idDetalleReceta") Integer idDetalleReceta,
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("idUnidad") Short idUnidad
    ) {}
}
