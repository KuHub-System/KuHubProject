package KuHub.modules.pedido_semana_a_bodega.dtos.request;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * DTO de búsqueda específico de Pedido Semanal a Bodega.
 * Extiende SearchDTO (term, page, idSemana, idAsignatura) y agrega el filtro
 * de estado para que la consulta de búsqueda incluya activos/inactivos/todos
 * directamente en BD (evita que registros inactivos queden fuera por la paginación).
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SearchPedidoSemanaBodegaDTO extends SearchDTO {
    /** Estado a filtrar: "ACTIVO", "INACTIVO" o null/vacío para todos. */
    private String estadoPedido;
}
