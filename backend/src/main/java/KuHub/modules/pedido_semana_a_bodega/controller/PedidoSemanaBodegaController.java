package KuHub.modules.pedido_semana_a_bodega.controller;

import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.dto.PedidoSemanaBodegaWithDetailsCreateDTO;
import KuHub.modules.pedido_semana_a_bodega.dtos.projection.CountPedidoSemanaBodegaAndStatusView;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.ImportarExcelResultado;
import KuHub.modules.pedido_semana_a_bodega.dtos.respose.record.PedidoSemanaBodegasPage;
import KuHub.modules.pedido_semana_a_bodega.dtos.request.PedidoSemanaBodegaWithDetailsUpdateDTO;
import KuHub.modules.pedido_semana_a_bodega.services.PedidoSemanaBodegaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/pedido-semana-bodega")
@Validated
public class PedidoSemanaBodegaController {

    @Autowired
    private PedidoSemanaBodegaService pedidoSemanaBodegaService;

    /**
     * Conta total de recetas, activas, inactivas
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @GetMapping("/count-recipes")
    public ResponseEntity<CountPedidoSemanaBodegaAndStatusView> countRecipesAndStatus(){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.countRecipesAndStatus());
    }

    /**
     * llama todas las recetas paginas
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PostMapping("/find-all-recipes-pagined/{page}")
    public ResponseEntity<PedidoSemanaBodegasPage> findAllRecipesPaginated(
            @PathVariable Integer page,
            @RequestParam(required = false) Integer idSemana
    ){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.findAllRecipesPaginated(page, idSemana));
    }

    /**
     * Llama las recetas por el nombre o descripcion similares paginada
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PostMapping("/search-recipes")
    public ResponseEntity<PedidoSemanaBodegasPage> findAllWithDetailsAndSearchPaging(
            @RequestBody SearchDTO searchDto
    ){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.findAllWithDetailsAndSearchPaging(searchDto));
    }

    /**Crea la receta con detalles
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PostMapping("/create-recipe-with-details")
    public ResponseEntity<Boolean> saveRecipeWithDetails(
            @RequestBody @Valid PedidoSemanaBodegaWithDetailsCreateDTO request) {
        return ResponseEntity
                .status(201)
                .body(pedidoSemanaBodegaService.saveRecipeWithDetails(request));
    }

    /**Actualiza el estado de la receta del tipo enum manejada para usar la receta en solicitudes
     * ✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PatchMapping("/change-status/{idReceta}")
    public ResponseEntity<Boolean> changeStatus(
            @PathVariable Integer idReceta
    ){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.changeStatus(idReceta));
    }

    @PatchMapping("/update-recipe-with-details")
    public ResponseEntity<Boolean> updateRecipeWithDetails(
            @RequestBody PedidoSemanaBodegaWithDetailsUpdateDTO request ){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.updateRecipeWithDetails(request));
    }

    @DeleteMapping("/soft-delete-receta/{idReceta}")
    public ResponseEntity<Boolean> softDeleteRecipeWithDetails(
        @PathVariable Integer idReceta){
        return ResponseEntity
                .status(204)
                .body(pedidoSemanaBodegaService.softDeleteRecipeWithDetails(idReceta));
    }

    /**
     * Parsea un archivo Excel (.xlsx/.xlsm) con el listado de pedido (filas 12-80).
     * Si se pasa nombreHoja se lee esa hoja por nombre exacto; si no, se lee la hoja activa.
     * ✅ En uso: consumido por importarExcelPedidoService en receta-service.ts.
     */
    @PostMapping(value = "/importar-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportarExcelResultado> importarExcel(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "nombreHoja", required = false) String nombreHoja) {
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.importarExcelProductos(archivo, nombreHoja));
    }






















    /**
    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<Receta> findById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.findById(id));
    }

    @GetMapping("/find-by-id-active-recipe-true/{id}")
    public ResponseEntity<Receta> findByIdRecetaAndActivoRecetaIsTrue(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.findByIdRecetaAndActivoRecetaIsTrue(id));
    }

    /**
    @GetMapping( "/find-recipe-with-details-active-in-true/{id}")
    public ResponseEntity<RecipeWithDetailsAnswerDTO> findRecipeWithDetailsActiveInTrue(
            @PathVariable Integer id
    )  {
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.findRecipeWithDetailsActiveInTrue(id));
    }

    @GetMapping("/find-all/")
    public ResponseEntity<List<Receta>> findAll(){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.findAll());
    }

    @GetMapping("/find-all-by-active-recipe-true/")
    public ResponseEntity<List<Receta>> findAllByActivoRecetaTrue(){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.findAllByActivoRecetaTrue());
    }

    @GetMapping("/exist-by-name-recipe-active-true/{nameRecipe}")
    public ResponseEntity<Boolean> existByNombreRecetaAndActivoRecetaTrue(
            @PathVariable String nameRecipe
    ){
        return ResponseEntity
                .status(200)
                .body(pedidoSemanaBodegaService.existsByNombreRecetaAndActivoRecetaTrue(nameRecipe));
    }

    @GetMapping("/find-all-recipe-with-details-active/")
    public ResponseEntity<List<RecipeWithDetailsAnswerDTO>> findAllRecipeWithDetailsActive(){
        try{
            return ResponseEntity
                    .status(200)
                    .body(pedidoSemanaBodegaService.findAllRecipeWithDetailsActive());
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
                .body(pedidoSemanaBodegaService.save(recipe));
    }



    @PutMapping("/update-recipe-with-details/")
    public ResponseEntity<?> updateRecipe(
            @RequestBody RecipeUpdateDeltaDTO dtoUpdate
    ){
        try {
            return ResponseEntity
                    .status(200)
                    .body(pedidoSemanaBodegaService.updateRecipeWithDelta(dtoUpdate));
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
            pedidoSemanaBodegaService.updateDeleteStatusActiveFalseRecipeWithDetails(idReceta);
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
            pedidoSemanaBodegaService.updateChangingStatusRecipeWith(idReceta);
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
            pedidoSemanaBodegaService.deleteById(id);
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
