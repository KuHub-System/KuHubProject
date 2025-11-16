package KuHub.modules.receta.services;

import KuHub.modules.receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.receta.entity.Receta;

import java.util.List;

public interface RecetaService {
    void syncSeqReceta();
    List<Receta> findAll();
    List<Receta>findAllByActivoRecetaTrue();
    Receta findById(Integer id);
    Receta findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);
    RecipeWithDetailsAnswerUpdateDTO findRecipeWithDetailsActiveInTrue(Integer id);
    Receta save (Receta receta);
    RecipeWithDetailsCreateDTO saveRecipeWithDetails (RecipeWithDetailsCreateDTO dto);
    Boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);
    List<RecipeWithDetailsAnswerUpdateDTO> findAllRecipeWithDetailsActive();
    RecipeWithDetailsAnswerUpdateDTO updateRecipeWithDetails(
            RecipeWithDetailsAnswerUpdateDTO dto
    );
    void updateDeleteStatusActiveFalseRecipeWithDetails(Integer idReceta);
    void updateChangingStatusRecipeWith(Integer idReceta);
}
