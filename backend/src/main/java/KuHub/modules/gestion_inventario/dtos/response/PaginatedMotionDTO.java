package KuHub.modules.gestion_inventario.dtos.response;

import KuHub.utils.PaginationUtils;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaginatedMotionDTO {
    private List<MotionAnswerDTO> content;
    private PaginationUtils.PagingResult pagination;
}