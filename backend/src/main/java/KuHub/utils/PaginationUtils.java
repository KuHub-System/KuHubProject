package KuHub.utils;

/**
 * Utilitario para gestión de paginación asimétrica (20/10) en KuHub
 */
public class PaginationUtils {
    /**
     * DTO inmutable para transportar los parámetros de paginación.
     */
    public record PagingResult(int page, int limit, int offset, int totalPages) {}

    /**
     * Calcula los parámetros de paginación asimétrica.
     * @param pageRequested Página solicitada por el cliente.
     * @param totalRegistros Total de registros encontrados en la DB.
     * @return PagingResult con los cálculos listos para el repositorio.
     */
    public static PagingResult buildPaging(Integer pageRequested, long totalRegistros) {
        int totalPages = calculateTotalPages(totalRegistros);

        // Ajuste de página solicitada
        int page = (pageRequested != null && pageRequested > 0) ? pageRequested : 1;
        if (page > totalPages && totalPages > 0) {
            page = totalPages;
        }

        int limit;
        int offset;

        // Lógica Asimétrica: 20 la primera, 10 las siguientes
        if (page == 1) {
            limit = 20;
            offset = 0;
        } else {
            limit = 10;
            offset = 20 + (page - 2) * 10;
        }

        return new PagingResult(page, limit, offset, totalPages);
    }

    /**
     * Calcula el total de páginas considerando que la primera tiene 20 items.
     */
    private static int calculateTotalPages(long totalRegistros) {
        if (totalRegistros <= 0) return 0;
        if (totalRegistros <= 20) return 1;
        return 1 + (int) Math.ceil((totalRegistros - 20) / 10.0);
    }
}
