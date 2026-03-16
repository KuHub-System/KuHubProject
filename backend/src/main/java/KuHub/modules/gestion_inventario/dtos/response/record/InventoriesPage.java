package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;

import java.math.BigDecimal;
import java.util.List;

public record InventoriesPage(
        List<InventoryItem> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {

    // =========================================================
    // Factory del response — evita repetir el constructor
    // =========================================================
    public static InventoriesPage of(
            List<Object[]> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        return new InventoriesPage(
                rows.stream()
                        .map(InventoryItem::fromRow)
                        .toList(),               // Java 16+ — si usas 11, usa Collectors.toList()
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }

    // =========================================================
    // Ítem individual — record estático anidado
    // =========================================================
    public record InventoryItem(
            Integer idInventario,
            Integer idProducto,

            String  nombreProducto,
            String  codProducto,
            String  descripcionProducto,

            Integer idCategoria,
            String  nombreCategoria,

            Integer idUnidad,
            String  nombreUnidad,
            Boolean esFraccionario,

            BigDecimal stock,
            BigDecimal stockLimit
    ) {
        // Factory de mapeo — la lógica queda junto al tipo que describe
        public static InventoryItem fromRow(Object[] row) {
            return new InventoryItem(
                    ((Number) row[8]).intValue(),   // idInventario
                    ((Number) row[9]).intValue(),   // idProducto
                    (String)     row[0],            // nombreProducto
                    (String)     row[1],            // codProducto
                    (String)     row[2],            // descripcionProducto
                    ((Number) row[10]).intValue(),  // idCategoria
                    (String)     row[3],            // nombreCategoria
                    ((Number) row[11]).intValue(),  // idUnidad
                    (String)     row[6],            // nombreUnidad
                    (Boolean)    row[7],            // esFraccionario
                    (BigDecimal) row[4],            // stock
                    (BigDecimal) row[5]             // stockLimit
            );
        }
    }
}
