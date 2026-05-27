package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;

import java.math.BigDecimal;
import java.util.List;

public record BulkWarehousesPage(
        List<ProductWarehouseBulkItem> content,
        int page,
        int limit,
        int totalPages,
        long totalElements
) {

    // [0] nombre_producto
    // [1] detalles  (unidad + abreviatura)
    // [2] stock  (bodega stock)
    // [3] es_fraccionario
    // [4] id_bodega_transito
    // [5] id_producto
    // [6] id_inventario
    public record ProductWarehouseBulkItem(
            String     nombreProducto,
            String     detalles,
            BigDecimal stock,
            Boolean    esFraccionario,
            Integer    idBodegaTransito,
            Integer    idProducto,
            Integer    idInventario
    ) {
        public static ProductWarehouseBulkItem fromRow(Object[] row) {
            return new ProductWarehouseBulkItem(
                    (String) row[0],
                    (String) row[1],
                    row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO,
                    row[3] != null ? (Boolean) row[3] : false,
                    row[4] != null ? ((Number) row[4]).intValue() : null,
                    row[5] != null ? ((Number) row[5]).intValue() : null,
                    row[6] != null ? ((Number) row[6]).intValue() : null
            );
        }
    }

    public static BulkWarehousesPage of(
            List<Object[]> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        List<ProductWarehouseBulkItem> content = rows.stream()
                .map(ProductWarehouseBulkItem::fromRow)
                .toList();
        return new BulkWarehousesPage(
                content,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }
}
