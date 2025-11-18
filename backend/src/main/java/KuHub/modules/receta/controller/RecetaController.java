package KuHub.modules.receta.controller;

import KuHub.modules.receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.receta.entity.Receta;
import KuHub.modules.receta.services.RecetaService;
import feign.Param;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/receta")
@Validated
public class RecetaController {

    @Autowired
    private RecetaService recetaService;

    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<Receta> findById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(recetaService.findById(id));
    }

    @GetMapping("/find-by-id-active-recipe-true/{id}")
        public ResponseEntity<Receta> findByIdRecetaAndActivoRecetaIsTrue(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(recetaService.findByIdRecetaAndActivoRecetaIsTrue(id));
    }


    @GetMapping("/find-all/")
    public ResponseEntity<List<Receta>> findAll(){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAll());
    }

    @GetMapping("/find-all-by-active-recipe-true/")
    public ResponseEntity<List<Receta>> findAllByActivoRecetaTrue(){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAllByActivoRecetaTrue());
    }

    @GetMapping("/exist-by-name-recipe-active-true/{nameRecipe}")
    public ResponseEntity<Boolean> existByNombreRecetaAndActivoRecetaTrue(
            @PathVariable String nameRecipe
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.existsByNombreRecetaAndActivoRecetaTrue(nameRecipe));
    }

    @GetMapping("/find-all-recipe-with-details-active/")
    public ResponseEntity<List<RecipeWithDetailsAnswerUpdateDTO>> findAllRecipeWithDetailsActive(){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAllRecipeWithDetailsActive());
    }

    @PostMapping("/create-recipe/")
    public ResponseEntity<Receta> save(
            @RequestBody Receta recipe
    ){
        return ResponseEntity
                .status(201)
                .body(recetaService.save(recipe));
    }

    @PostMapping("/create-recipe-with-details/")
    public ResponseEntity<RecipeWithDetailsCreateDTO> saveRecipeWithDetails(
            @RequestBody RecipeWithDetailsCreateDTO recipeWithDetailsCreateDTO){
        return ResponseEntity
                .status(201)
                .body(recetaService.saveRecipeWithDetails(recipeWithDetailsCreateDTO));
    }

    @PutMapping("/update-recipe-with-details/")
    public ResponseEntity<RecipeWithDetailsAnswerUpdateDTO> updateRecipe(
            @RequestBody RecipeWithDetailsAnswerUpdateDTO dtoUpdate
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.updateRecipeWithDetails(dtoUpdate));
    }


    @PutMapping("/update-status-active-false-recipe-with-details/{id_receta}")
    public ResponseEntity<?> updateDeleteStatusActiveFalseRecipeWithDetails(
            @PathVariable("id_receta") Integer idReceta) {

        try {
            recetaService.updateDeleteStatusActiveFalseRecipeWithDetails(idReceta);
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

    @PutMapping("/update-changing-status-recipe-with/{id_receta}")
    public ResponseEntity<Void> updateChangingStatusRecipeWithDetalis(
            @PathVariable("id_receta") Integer idReceta) {

        try {
            recetaService.updateChangingStatusRecipeWith(idReceta);
            return ResponseEntity.noContent().build(); // <--- ✔ sin body real
        } catch (RuntimeException ex) {
            return ResponseEntity.status(500)
                    .build();
        }
    }

    @DeleteMapping("/delete-recipe/{id}")
    public ResponseEntity<Void> deleteRecipe(@PathVariable Integer id) {
        recetaService.deleteById(id);
        return ResponseEntity.noContent().build();

    }

}
