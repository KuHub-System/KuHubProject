package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;

import java.math.BigDecimal;
import java.util.List;

public record StockDisponiblePage(
        List<StockDisponibleItem> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {

    public record StockDisponibleItem(
            String nombreProducto,    // 0
            String nombreCategoria,   // 1
            BigDecimal stock,         // 2
            String nombreUnidad,      // 3
            String abreviatura,       // 4
            String fechaRegistro,     // 5
            String tipoDisponible     // 6
    ) {
        public static StockDisponibleItem fromRow(Object[] row) {
            return new StockDisponibleItem(
                    (String) row[0],
                    (String) row[1],
                    row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO,
                    (String) row[3],
                    (String) row[4],
                    row[5] != null ? row[5].toString() : null,
                    (String) row[6]
            );
        }
    }

    public static StockDisponiblePage of(
            List<Object[]> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        List<StockDisponibleItem> data = rows.stream()
                .map(StockDisponibleItem::fromRow)
                .toList();

        return new StockDisponiblePage(
                data,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }
}
