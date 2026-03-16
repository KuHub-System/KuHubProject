package KuHub.modules.gestion_inventario.dtos.response.record;

import KuHub.utils.PaginationUtils;

import java.math.BigDecimal;
import java.util.List;

public record WarehousesPage(
        List<WarehouseItem> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {

    // ─── RECORD INTERNO (Ordenado igual que el SELECT SQL) ────────────
    public record WarehouseItem(
            String nombreProducto,        // 0
            String codProducto,           // 1
            String descripcionProducto,   // 2
            String nombreCategoria,       // 3
            BigDecimal stock,             // 4
            BigDecimal stockLimit,        // 5
            String nombreUnidad,          // 6
            Boolean esFraccionario,       // 7
            Integer idBodegaTransito,     // 8
            Integer idInventario,         // 9
            Integer idProducto,           // 10
            Integer idCategoria,          // 11
            Integer idUnidad              // 12
    ) {
        /** * Los índices y el orden de los parámetros coinciden exactamente con la consulta nativa.
         * Se usan conversiones seguras para evitar ClassCastException.
         */
        public static WarehouseItem fromRow(Object[] row) {
            return new WarehouseItem(
                    (String) row[0],                                        // 0: nombre_producto
                    (String) row[1],                                        // 1: cod_producto
                    (String) row[2],                                        // 2: descripcion_producto
                    (String) row[3],                                        // 3: nombre_categoria

                    // 4 y 5: Casteo seguro para BigDecimal
                    row[4] != null ? new BigDecimal(row[4].toString()) : BigDecimal.ZERO, // 4: stock
                    row[5] != null ? new BigDecimal(row[5].toString()) : BigDecimal.ZERO, // 5: stock_limit

                    (String) row[6],                                        // 6: nombre_unidad
                    row[7] != null ? (Boolean) row[7] : false,              // 7: es_fraccionario

                    // 8 al 12: Casteo seguro para Integers
                    row[8] != null ? ((Number) row[8]).intValue() : null,   // 8: id_bodega_transito
                    row[9] != null ? ((Number) row[9]).intValue() : null,   // 9: id_inventario
                    row[10] != null ? ((Number) row[10]).intValue() : null, // 10: id_producto
                    row[11] != null ? ((Number) row[11]).intValue() : null, // 11: id_categoria
                    row[12] != null ? ((Number) row[12]).intValue() : null  // 12: id_unidad
            );
        }
    }

    // ─── FACTORY ─────────────────────────────────────────────────────────────
    public static WarehousesPage of(
            List<Object[]> rows,
            PaginationUtils.PagingResult paging,
            long total
    ) {
        List<WarehouseItem> data = rows.stream()
                .map(WarehouseItem::fromRow)
                .toList();

        return new WarehousesPage(
                data,
                paging.page(),
                paging.limit(),
                paging.totalPages(),
                total
        );
    }
}
