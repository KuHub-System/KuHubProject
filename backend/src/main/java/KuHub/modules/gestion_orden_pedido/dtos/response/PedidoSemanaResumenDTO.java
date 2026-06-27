package KuHub.modules.gestion_orden_pedido.dtos.response;

import java.time.LocalDate;

/**
 * DTO de respuesta para el Paso 1 del modal "Generar Orden Pedido".
 * Representa un pedido APROBADO de la semana con contador de OPs ya generadas.
 *
 * Mapea desde {@code OrdenPedidoRepository.findPedidosSemanaConIndicadorOP}.
 *
 * El frontend decide la presentación según las cantidades:
 *   cubiertoPorReservados=true                        → chip "Cubierto por reservados" (bloquea generación)
 *   cantidadOrdenPedido=0 y cantidadOrdenCanceladas=0 → chip "Sin OP"
 *   cantidadOrdenPedido=0 y cantidadOrdenCanceladas>0 → chip "Existe un registro cancelado, realizar nuevo"
 *   cantidadOrdenPedido=1                              → chip "OP Generada"
 *   cantidadOrdenPedido≥2                             → chip "Ya existe un registro para este pedido"
 */
public record PedidoSemanaResumenDTO(
        Integer idPedido,
        LocalDate fechaInicioPedido,
        LocalDate fechaFinPedido,
        String estadoPedido,
        int cantidadOrdenPedido,
        int cantidadOrdenCanceladas,
        boolean tieneOrdenPedido,
        boolean cubiertoPorReservados
) {

    /** Convierte una fila de Object[] (consulta nativa) al DTO. */
    public static PedidoSemanaResumenDTO fromRow(Object[] row) {
        int cantidad    = ((Number) row[4]).intValue();
        int canceladas  = ((Number) row[5]).intValue();
        boolean cubierto = row[6] != null && (Boolean) row[6];
        return new PedidoSemanaResumenDTO(
                ((Number) row[0]).intValue(),
                ((java.sql.Date) row[1]).toLocalDate(),
                ((java.sql.Date) row[2]).toLocalDate(),
                (String) row[3],
                cantidad,
                canceladas,
                cantidad > 0,
                cubierto
        );
    }
}
