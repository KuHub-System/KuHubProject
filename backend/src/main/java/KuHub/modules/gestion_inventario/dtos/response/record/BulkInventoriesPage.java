package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.math.BigDecimal;
import java.util.List;

public record BulkInventoriesPage(
        List<ProductInventoryBulkView> content,
        int page,
        int limit,
        int totalPages,
        long totalElements
) {

    // =========================================================
    // Proyección de cada ítem — se mantiene como interfaz
    // porque Spring Data la necesita para el mapeo automático
    // =========================================================
    @JsonPropertyOrder({
            "nombreProducto",
            "detalles",
            "stock",
            "esFraccionario",
            "idInventario",
            "idProducto"
    })
    public interface ProductInventoryBulkView {
        String     getNombreProducto();
        String     getDetalles();
        BigDecimal getStock();
        Boolean    getEsFraccionario();
        Integer    getIdInventario();
        Integer    getIdProducto();
    }

    // =========================================================
    // Factory del response
    // =========================================================
    public static BulkInventoriesPage of(
            List<ProductInventoryBulkView> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        return new BulkInventoriesPage(
                rows,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }
}