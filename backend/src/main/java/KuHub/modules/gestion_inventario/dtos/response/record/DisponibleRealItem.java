package KuHub.modules.gestion_inventario.dtos.response.record;

import java.math.BigDecimal;

/**
 * Ítem de "Disponible Real" por producto para el modal de Stock Disponible.
 * disponible = (inventario + bodega de tránsito) − demanda comprometida − reservado.
 * Mismo cálculo que la columna "Disponible" de Generar OP / "Por Pedido" del Conglomerado.
 */
public record DisponibleRealItem(
        String nombreProducto,        // 0
        String nombreCategoria,       // 1
        String abreviatura,           // 2
        BigDecimal inventario,        // 3
        BigDecimal bodegaTransito,    // 4
        BigDecimal stockFisico,       // 5
        BigDecimal demandaComprometida, // 6
        BigDecimal reservado,         // 7
        BigDecimal disponible         // 8
) {
    public static DisponibleRealItem fromRow(Object[] row) {
        return new DisponibleRealItem(
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
