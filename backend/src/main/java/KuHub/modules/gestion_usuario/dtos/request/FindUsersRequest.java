package KuHub.modules.gestion_usuario.dtos.request;

import lombok.Data;

import java.util.List;

/**
 * Request para el listado paginado de usuarios.
 * Reemplaza el body de tipo Integer simple para soportar filtro por rol.
 */
@Data
public class FindUsersRequest {
    /** Página solicitada (1-based); null = página 1. */
    private Integer page;
    /** IDs de rol a filtrar; null o vacío = sin filtro de rol. */
    private List<Integer> roles;
}
