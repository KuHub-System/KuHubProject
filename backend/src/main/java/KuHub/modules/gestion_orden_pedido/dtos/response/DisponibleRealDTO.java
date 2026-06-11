package KuHub.modules.gestion_orden_pedido.dtos.response;

import java.math.BigDecimal;

/**
 * Disponible real de un producto en el momento de planificar la compra.
 *
 * {@code disponible = stockFisico − demandaComprometida}, donde:
 * - {@code stockFisico} = inventario + bodega de tránsito.
 * - {@code demandaComprometida} = Σ demanda real de solicitudes EN_PEDIDO ya abastecidas
 *   (líneas de OP con entregado=true, vía la puente detalle_orden_pedido_solicitud).
 *
 * Un {@code disponible} positivo indica sobrante (se puede pedir menos al proveedor);
 * negativo indica faltante por cubrir.
 */
public record DisponibleRealDTO(
        Integer idProducto,
        BigDecimal stockFisico,
        BigDecimal demandaComprometida,
        BigDecimal disponible
) {
    public static DisponibleRealDTO fromRow(Object[] row) {
        return new DisponibleRealDTO(
                ((Number) row[0]).intValue(),
                new BigDecimal(row[1].toString()),
                new BigDecimal(row[2].toString()),
                new BigDecimal(row[3].toString())
        );
    }
}
