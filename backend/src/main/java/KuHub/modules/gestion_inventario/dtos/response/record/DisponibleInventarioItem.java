package KuHub.modules.gestion_inventario.dtos.response.record;

import java.math.BigDecimal;

/**
 * Ítem de "Disponible en Inventario" por producto para el modal de Stock Disponible.
 * disponibleInventario = inventario − (comprometido − cubiertoBodega), donde
 * cubiertoBodega = LEAST(bodegaTransito, comprometido).
 * disponibleInventario + excedenteBodega = el "disponible" de Disponible Real: son la partición
 * de ese número entre lo usable ahora desde inventario y lo que existe en bodega pero necesita
 * una DEVOLUCION para volver a estarlo.
 */
public record DisponibleInventarioItem(
        String nombreProducto,          // 0
        String nombreCategoria,         // 1
        String abreviatura,             // 2
        BigDecimal inventario,          // 3
        BigDecimal bodegaTransito,      // 4
        BigDecimal comprometido,        // 5
        BigDecimal cubiertoBodega,      // 6
        BigDecimal disponibleInventario,// 7
        BigDecimal excedenteBodega      // 8
) {
    public static DisponibleInventarioItem fromRow(Object[] row) {
        return new DisponibleInventarioItem(
                (String) row[0],
                (String) row[1],
                (String) row[2],
                row[3] != null ? new BigDecimal(row[3].toString()) : BigDecimal.ZERO,
                row[4] != null ? new BigDecimal(row[4].toString()) : BigDecimal.ZERO,
                row[5] != null ? new BigDecimal(row[5].toString()) : BigDecimal.ZERO,
                row[6] != null ? new BigDecimal(row[6].toString()) : BigDecimal.ZERO,
                row[7] != null ? new BigDecimal(row[7].toString()) : BigDecimal.ZERO,
                row[8] != null ? new BigDecimal(row[8].toString()) : BigDecimal.ZERO
        );
    }
}
