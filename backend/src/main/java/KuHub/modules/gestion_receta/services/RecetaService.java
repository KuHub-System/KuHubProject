package KuHub.modules.gestion_receta.services;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_receta.dtos.request.dto.RecipeWithDetailsCreateDTO;
import KuHub.modules.gestion_receta.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.gestion_receta.dtos.respose.record.RecipesPage;
import KuHub.modules.gestion_receta.dtos.request.RecipeWithDetailsUpdateDTO;
import KuHub.modules.gestion_receta.entity.Receta;

public interface RecetaService {
    Receta findById(Integer id);
    CountRecipesAndStatusView countRecipesAndStatus();
    RecipesPage findAllRecipesPaginated(Integer pageRequested);
    RecipesPage findAllWithDetailsAndSearchPaging(SearchDTO searchDto);
    boolean saveRecipeWithDetails(RecipeWithDetailsCreateDTO dto);
    boolean updateRecipeWithDetails (RecipeWithDetailsUpdateDTO request);
    boolean changeStatus(Integer idReceta);
    boolean softDeleteRecipeWithDetails(Integer idReceta);


}
