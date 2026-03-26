package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.ChangeProductsToAnotherCategoryDTO;
import KuHub.modules.gestion_inventario.dtos.request.ChangeStatusActiveCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.CreateCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.UpdateCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.CategoriaView;
import KuHub.modules.gestion_inventario.entity.Categoria;
import KuHub.modules.gestion_inventario.services.CategoriaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Categorías de Inventario
 * Endpoints: /api/v1/categoria
 * ✅ En uso: Este controlador gestiona el CRUD de categorías, incluyendo la transferencia 
 * de productos entre categorías y el cambio de estado.
 * Consumido por categoria-service.ts en el frontend.
 */
@RestController
@Validated
@RequestMapping("/api/v1/categoria")
public class CategoriaController {

    @Autowired
    private CategoriaService categoriaService;

    /**
     * Obtiene el listado básico de todas las categorías.
     * ⚠️ Sin uso aparente: El frontend utiliza find-all-view para obtener datos adicionales.
     */
    @GetMapping()
    public ResponseEntity<List<Categoria>> findAll(){
        return ResponseEntity
                .status(200)
                .body(categoriaService.findAll());
    }

    /**
     * Obtiene todas las categorías incluyendo el conteo de productos asociados.
     * ✅ En uso: Consumido por obtenerCategoriasService en categoria-service.ts.
     */
    @GetMapping("/find-all-view")
    public ResponseEntity<List<CategoriaView>> findAllView(){
        return ResponseEntity
                .status(200)
                .body(categoriaService.findAllPage());
    }

    /**
     * Obtiene la lista de categorías que se encuentran activas.
     * ✅ En uso: Consumido por obtenerCategoriasActivasService en categoria-service.ts.
     */
    @GetMapping("/active-true")
    public ResponseEntity<List<Categoria>> findAllActiveTrue(){
        return ResponseEntity
                .status(200)
                .body(categoriaService.findAllEnable());
    }

    /**
     * Crea una nueva categoría de productos en el sistema.
     * ✅ En uso: Consumido por crearCategoriaService en categoria-service.ts.
     */
    @PostMapping()
    public ResponseEntity<Boolean> createCategoria(
            @Valid @RequestBody CreateCategoriaDTO request){
        return ResponseEntity
                .status(201)
                .body(categoriaService.createCategoria(request));
    }

    /**
     * Actualiza la información de una categoría existente.
     * ✅ En uso: Consumido por actualizarCategoriaService en categoria-service.ts.
     */
    @PatchMapping
    public ResponseEntity<Boolean> updateCategoria(
            @Valid @RequestBody UpdateCategoriaDTO request){
        return ResponseEntity
                .status(200)
                .body(categoriaService.updateCategoria(request));
    }

    /**
     * Alterna el estado de activación de una categoría específica.
     * ✅ En uso: Consumido por cambiarEstadoCategoriaService en categoria-service.ts.
     */
    @PatchMapping("/change-status")
    public ResponseEntity<Void> changeStatus(
            @Valid @RequestBody  ChangeStatusActiveCategoriaDTO request) {
        categoriaService.changeStatusCategoria(request);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reasocia todos los productos de una categoría a otra categoría de destino.
     * ✅ En uso: Consumido por transferirProductosService en categoria-service.ts.
     */
    @PutMapping("/change-products-to-another-category")
    public ResponseEntity<String> changeProductsToAnotherCategory(
            @RequestBody ChangeProductsToAnotherCategoryDTO request){
        return ResponseEntity
                .status(200)
                .body(categoriaService.changeProductsToAnotherCategory(request));
    }

    /**
     * Elimina una categoría del sistema por su ID.
     * ✅ En uso: Consumido por eliminarCategoriaService en categoria-service.ts.
     */
    @DeleteMapping("/{idCategoria}")
    public ResponseEntity<Boolean> deleteByIdCategoria(
            @PathVariable Short idCategoria){
        return ResponseEntity
                .status(200)
                .body(categoriaService.deleteCategoria(idCategoria));
    }

}
