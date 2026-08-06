package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;

import java.util.List;

/**
 * Página de "Disponible en Inventario" (cálculo agregado por producto), filtrable por categoría
 * y búsqueda de nombre, y paginada igual que DisponibleRealPage.
 */
public record DisponibleInventarioPage(
        List<DisponibleInventarioItem> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {
    public static DisponibleInventarioPage of(
            List<Object[]> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        List<DisponibleInventarioItem> data = rows.stream()
                .map(DisponibleInventarioItem::fromRow)
                .toList();

        return new DisponibleInventarioPage(
                data,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }
}
