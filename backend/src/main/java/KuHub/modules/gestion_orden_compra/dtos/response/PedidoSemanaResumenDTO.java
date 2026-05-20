package KuHub.modules.gestion_orden_compra.dtos.response;

import java.time.LocalDate;

/**
 * DTO de respuesta para el Paso 1 del modal "Generar Orden de Compra".
 * Representa un pedido APROBADO de la semana con contador de OCs ya generadas.
 *
 * Mapea desde {@code OrdenCompraRepository.findPedidosSemanaConIndicadorOC}.
 *
 * El frontend decide la presentación según {@code cantidadOrdenCompra}:
 *   0   → chip "Sin OC"
 *   1   → chip "OC Generada"
 *   ≥2  → mensaje "Ya existe un registro para este pedido" (no bloquea selección)
 */
public record PedidoSemanaResumenDTO(
        Integer idPedido,
        LocalDate fechaInicioPedido,
        LocalDate fechaFinPedido,
        String estadoPedido,
        int cantidadOrdenCompra,
        boolean tieneOrdenCompra
) {

    /** Convierte una fila de Object[] (consulta nativa) al DTO. */
    public static PedidoSemanaResumenDTO fromRow(Object[] row) {
        int cantidad = ((Number) row[4]).intValue();
        return new PedidoSemanaResumenDTO(
                ((Number) row[0]).intValue(),
                ((java.sql.Date) row[1]).toLocalDate(),
                ((java.sql.Date) row[2]).toLocalDate(),
                (String) row[3],
                cantidad,
                cantidad > 0
        );
    }
}
