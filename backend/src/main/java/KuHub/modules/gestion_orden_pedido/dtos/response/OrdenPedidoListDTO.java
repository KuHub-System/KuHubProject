package KuHub.modules.gestion_orden_pedido.dtos.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Resumen de una Orden de Pedido para la vista de listado (sin detalles de líneas). */
public record OrdenPedidoListDTO(
        Integer idOrdenPedido,
        Integer idPedido,
        LocalDate fechaInicioPedido,
        LocalDate fechaFinPedido,
        Integer idProveedor,
        String nombreDistribuidora,
        String nombreProveedor,
        LocalDateTime fechaCreacion,
        String estadoOrdenPedido,
        String observaciones,
        long cantidadDetalles,
        BigDecimal totalNeto,
        BigDecimal totalConIva
) {
    /** Mapea un row nativo [0..12] al DTO. */
    public static OrdenPedidoListDTO fromRow(Object[] r) {
        return new OrdenPedidoListDTO(
                ((Number) r[0]).intValue(),                          // id_orden_pedido
                ((Number) r[1]).intValue(),                          // id_pedido
                LocalDate.parse(r[2].toString()),                    // fecha_inicio_pedido
                LocalDate.parse(r[3].toString()),                    // fecha_fin_pedido
                ((Number) r[4]).intValue(),                          // id_proveedor
                (String) r[5],                                       // nombre_distribuidora
                (String) r[6],                                       // nombre_proveedor
                ((java.sql.Timestamp) r[7]).toLocalDateTime(),       // fecha_creacion
                (String) r[8],                                       // estado_orden_pedido
                (String) r[9],                                       // observaciones (nullable)
                r[10] != null ? ((Number) r[10]).longValue() : 0L,  // cantidad_detalles
                r[11] != null ? new BigDecimal(r[11].toString()) : BigDecimal.ZERO, // total_neto
                r[12] != null ? new BigDecimal(r[12].toString()) : BigDecimal.ZERO  // total_con_iva
        );
    }
}
