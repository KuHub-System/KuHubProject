package KuHub.modules.pedido_semana_a_bodega.dtos.respose.record;

import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.RecipeWithDetailsView;
import KuHub.utils.PaginationUtils;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

public record RecipesPage(
        List<RecipeItem> content,
        PaginationUtils.PagingResult paging
) {

    // ─── RECORD INTERNO: Item de receta con sus detalles ─────────────────────
    public record RecipeItem(
            Integer idReceta,
            String nombreReceta,
            String descripcionReceta,
            String instruccionesReceta,
            String estadoReceta,
            Long totalIngredientes,
            List<RecipeDetail> detalles
    ) {}

    // ─── RECORD INTERNO: Detalle de ingrediente ───────────────────────────────
    @JsonPropertyOrder({
            "nombreProducto",
            "cantProducto",
            "abreviatura",
            "idDetalleReceta",
            "idProducto",
            "idUnidad"
    })
    public record RecipeDetail(
            String nombreProducto,
            BigDecimal cantProducto,
            String abreviatura,
            Integer idDetalleReceta,
            Integer idProducto,
            Integer idUnidad
    ) {}

    // ─── FACTORY ─────────────────────────────────────────────────────────────
    public static RecipesPage of(
            List<RecipeWithDetailsView> rows,
            PaginationUtils.PagingResult paging,
            ObjectMapper objectMapper
    ) {
        List<RecipeItem> content = rows.stream().map(row -> {
            List<RecipeDetail> detalles;
            try {
                String jsonStr = row.getDetallesJson();
                detalles = (jsonStr != null && !jsonStr.isBlank())
                        ? objectMapper.readValue(jsonStr, new TypeReference<List<RecipeDetail>>() {})
                        : Collections.emptyList();
            } catch (Exception e) {
                detalles = Collections.emptyList();
            }

            return new RecipeItem(
                    row.getIdReceta(),
                    row.getNombreReceta(),
                    row.getDescripcionReceta(),
                    row.getInstruccionesReceta(),
                    StringUtils.enumToHumanText(row.getEstadoReceta()),
                    row.getTotalIngredientes(),
                    detalles
            );
        }).toList();

        return new RecipesPage(content, paging);
    }
}