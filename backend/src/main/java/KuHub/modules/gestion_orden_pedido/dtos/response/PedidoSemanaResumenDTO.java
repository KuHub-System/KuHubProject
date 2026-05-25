package KuHub.modules.gestion_orden_pedido.dtos.response;

import java.time.LocalDate;

/**
 * DTO de respuesta para el Paso 1 del modal "Generar Orden Pedido".
 * Representa un pedido APROBADO de la semana con contador de OPs ya generadas.
 *
 * Mapea desde {@code OrdenPedidoRepository.findPedidosSemanaConIndicadorOP}.
 *
 * El frontend decide la presentación según {@code cantidadOrdenPedido}:
 *   0   → chip "Sin OP"
 *   1   → chip "OP Generada"
 *   ≥2  → mensaje "Ya existe un registro para este pedido" (no bloquea selección)
 */
public record PedidoSemanaResumenDTO(
        Integer idPedido,
        LocalDate fechaInicioPedido,
        LocalDate fechaFinPedido,
        String estadoPedido,
        int cantidadOrdenPedido,
        boolean tieneOrdenPedido
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
