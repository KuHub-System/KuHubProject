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
        Integer idAsignatura,
        List<RecipeDetailsDTO> detalles
) {

    // ============================================================================
    // 1. DETALLE DE RECETA — parseado desde row[2] (JSONB)
    //    Nombres en JSON (camelCase) ← Columnas BD (snake_case)
    //    - nombreProducto ← p.nombre_producto
    //    - cantProducto ← d.cant_producto
    //    - abreviatura ← u.abreviatura
    //    - esFraccionario ← u.es_fraccionario
    //    - activo ← p.activo
    //    - idDetallePedidoSemana ← d.id_detalle_pedido_semana
    //    - idProducto ← p.id_producto
    //    - idUnidad ← u.id_unidad
    //    - observacion ← d.observacion
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RecipeDetailsDTO(
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantProducto") BigDecimal cantProducto,
            @JsonProperty("abreviatura") String abreviatura,
            @JsonProperty("esFraccionario") Boolean esFraccionario,
            @JsonProperty("activo") Boolean activo,
            @JsonProperty("idDetallePedidoSemana") Integer idDetallePedidoSemana,
            @JsonProperty("idProducto") Integer idProducto,
            @JsonProperty("idUnidad") Short idUnidad,
            @JsonProperty("observacion") String observacion
    ) {}
}
