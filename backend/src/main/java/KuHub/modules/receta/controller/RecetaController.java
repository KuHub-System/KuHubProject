package KuHub.modules.receta.controller;

import KuHub.modules.receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.receta.services.RecetaService;
import feign.Param;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/receta")
@Validated
public class RecetaController {

    @Autowired
    private RecetaService recetaService;

    @GetMapping("/find-all-recipe-with-details-active/")
    public ResponseEntity<List<RecipeWithDetailsAnswerUpdateDTO>> findAllRecipeWithDetailsActive(){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAllRecipeWithDetailsActive());
    }

    @PostMapping("/create-recipe-with-details/")
    public ResponseEntity<RecipeWithDetailsCreateDTO> saveRecipeWithDetails(
            @RequestBody RecipeWithDetailsCreateDTO recipeWithDetailsCreateDTO){
        return ResponseEntity
                .status(201)
                .body(recetaService.saveRecipeWithDetails(recipeWithDetailsCreateDTO));
    }

    @PutMapping("/update-recipe-with-details/")
    public ResponseEntity<?> updateRecipe(
            @RequestBody RecipeWithDetailsAnswerUpdateDTO dtoUpdate
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.updateRecipeWithDetails(dtoUpdate));
    }

    @PutMapping("/update-status-active-false-recipe-with-details/{id_receta}")
    public ResponseEntity<?> updateStatusActiveFalseRecipeWithDetails(
            @PathVariable("id_receta") Integer idReceta) {

        try {
            recetaService.updateStatusActiveFalseRecipeWithDetails(idReceta);
            return ResponseEntity.ok().build();

        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("La receta con ID " + idReceta + " no existe o ya está inactiva.");

        } catch (Exception ex) {
            /* Log real
            log.error("❌ Error inesperado al desactivar receta {}", idReceta, ex);
            **/
            // Respuesta genérica al cliente
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error inesperado al procesar la solicitud.");
        }
    }


}
