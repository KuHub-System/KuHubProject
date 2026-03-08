package KuHub.modules.gestion_receta.dtos.respose;

import KuHub.utils.PaginationUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RecipePagedDTO {
    private List<RecipeWithDetailsDTO> content;
    private PaginationUtils.PagingResult paging;
}
