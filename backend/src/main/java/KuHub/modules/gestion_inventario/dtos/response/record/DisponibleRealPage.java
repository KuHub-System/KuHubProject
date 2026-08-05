package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;

import java.util.List;

/**
 * Página de "Disponible Real" (cálculo agregado por producto), filtrable por categoría
 * y búsqueda de nombre, y paginada igual que StockDisponiblePage.
 */
public record DisponibleRealPage(
        List<DisponibleRealItem> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {
    public static DisponibleRealPage of(
            List<Object[]> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        List<DisponibleRealItem> data = rows.stream()
                .map(DisponibleRealItem::fromRow)
                .toList();

        return new DisponibleRealPage(
                data,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }
}
