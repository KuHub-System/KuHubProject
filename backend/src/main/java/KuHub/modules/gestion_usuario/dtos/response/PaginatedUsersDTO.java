package KuHub.modules.gestion_usuario.dtos.response;

import KuHub.modules.gestion_usuario.dtos.UsersView;
import KuHub.utils.PaginationUtils;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO para la respuesta paginada de usuarios en el frontend.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaginatedUsersDTO {
    /** Lista de usuarios proyectada (20 en pág 1, 10 en las siguientes) */
    private List<UsersView> content;

    /** Metadata de la paginación asimétrica calculada */
    private PaginationUtils.PagingResult pagination;
}
