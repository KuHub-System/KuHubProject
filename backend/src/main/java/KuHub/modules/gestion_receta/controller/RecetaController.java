package KuHub.modules.gestion_receta.controller;

import KuHub.modules.gestion_inventario.dtos.request.dto.SearchDTO;
import KuHub.modules.gestion_receta.dtos.RecipeWithDetailsCreateDTO;
import KuHub.modules.gestion_receta.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.gestion_receta.dtos.respose.RecipePagedDTO;
import KuHub.modules.gestion_receta.services.RecetaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/receta")
@Validated
public class RecetaController {

    @Autowired
    private RecetaService recetaService;

    /**
     * Conta total de recetas, activas, inactivas
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @GetMapping("/count-recipes")
    public ResponseEntity<CountRecipesAndStatusView> countRecipesAndStatus(){
        return ResponseEntity
                .status(200)
                .body(recetaService.countRecipesAndStatus());
    }

    /**
     * Crea una nueva receta junto con todos sus ingredientes detallados.
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PostMapping("/find-all-recipes-pagined/{page}")
    public ResponseEntity<RecipePagedDTO> findAllRecipesPaginated(
            @PathVariable Integer page
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAllRecipesPaginated(page));
    }

    @PostMapping("/search-recipes")
    public ResponseEntity<RecipePagedDTO> findAllWithDetailsAndSearchPaging(
            @RequestBody SearchDTO searchDto
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAllWithDetailsAndSearchPaging(searchDto));
    }

    /**Crea la receta con detalles
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PostMapping("/create-recipe-with-details")
    public ResponseEntity<Boolean> saveRecipeWithDetails(
            @RequestBody @Valid RecipeWithDetailsCreateDTO request) {
        return ResponseEntity
                .status(201)
                .body(recetaService.saveRecipeWithDetails(request));
    }





















    /**
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

    /**
    @GetMapping( "/find-recipe-with-details-active-in-true/{id}")
    public ResponseEntity<RecipeWithDetailsAnswerDTO> findRecipeWithDetailsActiveInTrue(
            @PathVariable Integer id
    )  {
        return ResponseEntity
                .status(200)
                .body(recetaService.findRecipeWithDetailsActiveInTrue(id));
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
    public ResponseEntity<List<RecipeWithDetailsAnswerDTO>> findAllRecipeWithDetailsActive(){
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



    @PutMapping("/update-recipe-with-details/")
    public ResponseEntity<?> updateRecipe(
            @RequestBody RecipeUpdateDeltaDTO dtoUpdate
    ){
        try {
            return ResponseEntity
                    .status(200)
                    .body(recetaService.updateRecipeWithDelta(dtoUpdate));
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
            return ResponseEntity.status(204).build();

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
            return ResponseEntity.status(200).build();
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
