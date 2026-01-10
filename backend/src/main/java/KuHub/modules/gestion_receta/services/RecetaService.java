package KuHub.modules.gestion_receta.services;

import KuHub.modules.gestion_receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.gestion_receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.gestion_receta.entity.Receta;

import java.util.List;

public interface RecetaService {
    List<Receta> findAll();
    List<Receta>findAllByActivoRecetaTrue();
    Receta findById(Integer id);
    Receta findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);
    String findNombreById (Integer id);
    RecipeWithDetailsAnswerUpdateDTO findRecipeWithDetailsActiveInTrue(Integer id);
    Receta save (Receta receta);
    RecipeWithDetailsCreateDTO saveRecipeWithDetails (RecipeWithDetailsCreateDTO dto);
    Boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);
    Boolean existsById(Integer id);
    List<RecipeWithDetailsAnswerUpdateDTO> findAllRecipeWithDetailsActive();
    RecipeWithDetailsAnswerUpdateDTO updateRecipeWithDetails(
            RecipeWithDetailsAnswerUpdateDTO dto
    );
    void updateDeleteStatusActiveFalseRecipeWithDetails(Integer idReceta);
    void updateChangingStatusRecipeWith(Integer idReceta);
    void deleteById(Integer id);

}
