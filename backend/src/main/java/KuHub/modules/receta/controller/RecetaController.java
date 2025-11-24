package KuHub.modules.receta.controller;

import KuHub.modules.receta.dtos.RecipeWithDetailsAnswerUpdateDTO;
import KuHub.modules.receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.receta.entity.Receta;
import KuHub.modules.receta.services.RecetaService;
import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
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
        try{
            return ResponseEntity
                    .status(200)
                    .body(recetaService.findAllRecipeWithDetailsActive());
        } catch (Exception ex) {
            return ResponseEntity.status(500).build();
        }
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
    public ResponseEntity<?> saveRecipeWithDetails(
            @RequestBody RecipeWithDetailsCreateDTO recipeWithDetailsCreateDTO){
        try {
            return ResponseEntity
                    .status(201)
                    .body(recetaService.saveRecipeWithDetails(recipeWithDetailsCreateDTO));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .status(404)
                    .body("La receta no pudo crearse porque uno de los datos enviados no existe o no es válido.");
        } catch (EntityExistsException ex) {
            return ResponseEntity
                    .status(409)
                    .body("La receta ya existe o está duplicada. No se puede crear nuevamente.");
        } catch (Exception ex) {
            return ResponseEntity
                    .status(500)
                    .build();
        }
    }

    @PutMapping("/update-recipe-with-details/")
    public ResponseEntity<?> updateRecipe(
            @RequestBody RecipeWithDetailsAnswerUpdateDTO dtoUpdate
    ){
        try {
            return ResponseEntity
                    .status(200)
                    .body(recetaService.updateRecipeWithDetails(dtoUpdate));
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(404)
                    .body("La receta que intentas actualizar no existe.");

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(400)
                    .body("Los datos enviados para actualizar la receta no son válidos.");

        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .build();
        }
    }

    @PutMapping("/update-status-active-false-recipe-with-details/{id_receta}")
    public ResponseEntity<?> updateDeleteStatusActiveFalseRecipeWithDetails(
            @PathVariable("id_receta") Integer idReceta) {
        try {
            recetaService.updateDeleteStatusActiveFalseRecipeWithDetails(idReceta);
            return ResponseEntity.ok().build();  // 200 OK sin body

        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(404)
                    .body("La receta con ID " + idReceta + " no existe o ya está inactiva.");

        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body("Error inesperado al procesar la solicitud.");
        }
    }

    @PutMapping("/update-changing-status-recipe-with/{id_receta}")
    public ResponseEntity<?> updateChangingStatusRecipeWithDetalis(
            @PathVariable("id_receta") Integer idReceta) {
        try {
            recetaService.updateChangingStatusRecipeWith(idReceta);
            return ResponseEntity.status(204).build();
        } catch (EntityNotFoundException ex) {
            return ResponseEntity
                    .status(404)
                    .body("La receta con el ID especificado no existe.");
        } catch (Exception ex) {
            return ResponseEntity
                    .status(500)
                    .body("Ocurrió un error inesperado al intentar actualizar el estado.");
        }
    }

    /**
    @DeleteMapping("/delete-recipe/{id}")
    public ResponseEntity<Void> deleteRecipe(@PathVariable Integer id) {
        try {
            recetaService.deleteById(id);
            return ResponseEntity.noContent().build(); // 204 - Eliminación exitosa, sin body
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build(); // 404 - No existe la receta
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build(); // 400 - id inválido o error de argumento
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // 500 - error inesperado
        }
    }
    */

}
