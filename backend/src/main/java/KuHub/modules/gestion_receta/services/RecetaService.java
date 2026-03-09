package KuHub.modules.gestion_receta.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.SearchDTO;
import KuHub.modules.gestion_receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.gestion_receta.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.gestion_receta.dtos.respose.RecipePagedDTO;
import KuHub.modules.gestion_receta.dtos.respose.request.RecipeWithDetailsUpdateDTO;
import KuHub.modules.gestion_receta.entity.Receta;

public interface RecetaService {
    Receta findById(Integer id);
    CountRecipesAndStatusView countRecipesAndStatus();
    RecipePagedDTO findAllRecipesPaginated(Integer pageRequested);
    RecipePagedDTO findAllWithDetailsAndSearchPaging(SearchDTO searchDto);
    boolean saveRecipeWithDetails(RecipeWithDetailsCreateDTO dto);
    boolean updateRecipeWithDetails (RecipeWithDetailsUpdateDTO request);
    boolean changeStatus(Integer idReceta);
    boolean softDeleteRecipeWithDetails(Integer idReceta);




    /**
    List<Receta> findAll();
    List<Receta>findAllByActivoRecetaTrue();
    Receta findById(Integer id);
    Receta findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);
    String findNombreById (Integer id);
    //RecipeWithDetailsAnswerDTO findRecipeWithDetailsActiveInTrue(Integer id);
    Receta save (Receta receta);
    RecipeWithDetailsAnswerDTO saveRecipeWithDetails(RecipeWithDetailsCreateDTO dto);
    Boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);
    Boolean existsById(Integer id);
    List<RecipeWithDetailsAnswerDTO> findAllRecipeWithDetailsActive();
    RecipeWithDetailsAnswerDTO updateRecipeWithDelta(RecipeUpdateDeltaDTO dto);
    void updateDeleteStatusActiveFalseRecipeWithDetails(Integer idReceta);
    void updateChangingStatusRecipeWith(Integer idReceta);
    void deleteById(Integer id);*/

}
