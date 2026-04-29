package KuHub.modules.pedido_semana_a_bodega.dtos.respose.record;

import KuHub.modules.pedido_semana_a_bodega.dtos.respose.projection.PedidoSemanaBodegaWithDetailsView;
import KuHub.utils.PaginationUtils;
import KuHub.utils.StringUtils;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

public record PedidoSemanaBodegasPage(
        List<RecipeItem> content,
        PaginationUtils.PagingResult paging
) {

    // ─── RECORD INTERNO: Item de receta con sus detalles ─────────────────────
    public record RecipeItem(
            Integer idPedidoSemanaBodega,
            String nombrePedido,
            String descripcionPedido,
            String instrucciones,
            String estadoPedido,
            Long totalDetalles,
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
    public static PedidoSemanaBodegasPage of(
            List<PedidoSemanaBodegaWithDetailsView> rows,
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
                    row.getIdPedidoSemanaBodega(),
                    row.getNombrePedido(),
                    row.getDescripcionPedido(),
                    row.getInstrucciones(),
                    StringUtils.enumToHumanText(row.getEstadoPedido()),
                    row.getTotalDetalles(),
                    detalles
            );
        }).toList();

        return new PedidoSemanaBodegasPage(content, paging);
    }
}