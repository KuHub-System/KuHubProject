package KuHub.modules.gestion_receta.controller;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_receta.dtos.request.dto.RecipeWithDetailsCreateDTO;
import KuHub.modules.gestion_receta.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.gestion_receta.dtos.respose.record.RecipesPage;
import KuHub.modules.gestion_receta.dtos.request.RecipeWithDetailsUpdateDTO;
import KuHub.modules.gestion_receta.services.RecetaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST para gestión de Recetas
 * Endpoints: /api/v1/receta
 * ✅ En uso: Este controlador gestiona la creación, actualización, búsqueda paginada 
 * y cambio de estado de recetas con sus detalles.
 * Consumido por receta-service.ts en el frontend.
 */
@RestController
@RequestMapping("/api/v1/receta")
@Validated
public class RecetaController {

    @Autowired
    private RecetaService recetaService;

    /**
     * Obtiene el conteo total de recetas, discriminando entre activas e inactivas.
     * ✅ En uso: Consumido por obtenerRecetasCountService en receta-service.ts.
     */
    @GetMapping("/count-recipes")
    public ResponseEntity<CountRecipesAndStatusView> countRecipesAndStatus(){
        return ResponseEntity
                .status(200)
                .body(recetaService.countRecipesAndStatus());
    }

    /**
     * Obtiene el listado de recetas con paginación.
     * ✅ En uso: Consumido por obtenerRecetasPaginadasService en receta-service.ts.
     */
    @PostMapping("/find-all-recipes-pagined/{page}")
    public ResponseEntity<RecipesPage> findAllRecipesPaginated(
            @PathVariable Integer page
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAllRecipesPaginated(page));
    }

    /**
     * Busca recetas que coincidan con un término en nombre o descripción, con paginación.
     * ✅ En uso: Consumido por buscarRecetasPaginadasService en receta-service.ts.
     */
    @PostMapping("/search-recipes")
    public ResponseEntity<RecipesPage> findAllWithDetailsAndSearchPaging(
            @RequestBody SearchDTO searchDto
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.findAllWithDetailsAndSearchPaging(searchDto));
    }

    /**
     * Crea una nueva receta incluyendo todos sus ingredientes detallados.
     * ✅ En uso: Consumido por crearRecetaConDetallesService en receta-service.ts.
     */
    @PostMapping("/create-recipe-with-details")
    public ResponseEntity<Boolean> saveRecipeWithDetails(
            @RequestBody @Valid RecipeWithDetailsCreateDTO request) {
        return ResponseEntity
                .status(201)
                .body(recetaService.saveRecipeWithDetails(request));
    }

    /**
     * Cambia el estado de una receta (Activo/Inactivo).
     * ✅ En uso: Consumido por cambiarEstadoRecetaService en receta-service.ts.
     */
    @PatchMapping("/change-status/{idReceta}")
    public ResponseEntity<Boolean> changeStatus(
            @PathVariable Integer idReceta
    ){
        return ResponseEntity
                .status(200)
                .body(recetaService.changeStatus(idReceta));
    }

    /**
     * Actualiza la información y los ingredientes de una receta existente.
     * ✅ En uso: Consumido por actualizarRecetaConDetallesService en receta-service.ts.
     */
    @PatchMapping("/update-recipe-with-details")
    public ResponseEntity<Boolean> updateRecipeWithDetails(
            @RequestBody RecipeWithDetailsUpdateDTO request ){
        return ResponseEntity
                .status(200)
                .body(recetaService.updateRecipeWithDetails(request));
    }

    /**
     * Realiza una eliminación lógica (soft delete) de una receta.
     * ✅ En uso: Consumido por softDeleteRecetaService en receta-service.ts.
     */
    @DeleteMapping("/soft-delete-receta/{idReceta}")
    public ResponseEntity<Boolean> softDeleteRecipeWithDetails(
        @PathVariable Integer idReceta){
        return ResponseEntity
                .status(204)
                .body(recetaService.softDeleteRecipeWithDetails(idReceta));
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
