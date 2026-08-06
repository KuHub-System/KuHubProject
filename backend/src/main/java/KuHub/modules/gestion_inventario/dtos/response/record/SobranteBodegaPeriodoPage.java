package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;

import java.math.BigDecimal;
import java.util.List;

/**
 * Página de sobrante en Bodega de Tránsito calculado para un período: stock físico de bodega
 * menos la demanda de solicitudes EN_PEDIDO pendientes en ese rango. Paginada y filtrable por
 * categoría y búsqueda, igual que StockDisponiblePage / DisponibleRealPage.
 */
public record SobranteBodegaPeriodoPage(
        List<SobranteBodegaPeriodoItem> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {

    public record SobranteBodegaPeriodoItem(
            String nombreProducto,        // 0
            String nombreCategoria,       // 1
            String nombreUnidad,          // 2
            String abreviatura,           // 3
            BigDecimal stockBodegaTransito, // 4
            BigDecimal cantidadDemandada,   // 5
            BigDecimal cantidadSobrante     // 6
    ) {
        public static SobranteBodegaPeriodoItem fromRow(Object[] row) {
            return new SobranteBodegaPeriodoItem(
                    (String) row[0],
                    (String) row[1],
                    (String) row[2],
                    (String) row[3],
                    new BigDecimal(row[4].toString()),
                    new BigDecimal(row[5].toString()),
                    new BigDecimal(row[6].toString())
            );
        }
    }

    public static SobranteBodegaPeriodoPage of(
            List<Object[]> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        List<SobranteBodegaPeriodoItem> data = rows.stream()
                .map(SobranteBodegaPeriodoItem::fromRow)
                .toList();

        return new SobranteBodegaPeriodoPage(
                data,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }
}
