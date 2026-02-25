package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.dto.ChangeProductsToAnotherCategoryDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.ChangeStatusActiveCategoriaDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.CreateCategoriaDTO;
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

@RestController
@Validated
@RequestMapping("/api/v1/categoria")
public class CategoriaController {

    @Autowired
    private CategoriaService categoriaService;

    /**❌FUNCIONAL PERO NO IMPLEMENTADO EN EL FRONT*/
    @GetMapping()
    public ResponseEntity<List<Categoria>> findAll(){
        return ResponseEntity
                .status(200)
                .body(categoriaService.findAll());
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @GetMapping("/find-all-view")
    public ResponseEntity<List<CategoriaView>> findAllView(){
        return ResponseEntity
                .status(200)
                .body(categoriaService.findAllPage());
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @GetMapping("/active-true")
    public ResponseEntity<List<Categoria>> findAllActiveTrue(){
        return ResponseEntity
                .status(200)
                .body(categoriaService.findAllEnable());
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PostMapping()
    public ResponseEntity<Boolean> createCategoria(
            @Valid @RequestBody CreateCategoriaDTO categoria){
        return ResponseEntity
                .status(201)
                .body(categoriaService.createCategoria(categoria));
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PatchMapping
    public ResponseEntity<Boolean> updateCategoria(
            @Valid @RequestBody UpdateCategoriaDTO categoria){
        return ResponseEntity
                .status(200)
                .body(categoriaService.updateCategoria(categoria));
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PatchMapping("/change-status")
    public ResponseEntity<Void> changeStatus(
            @Valid @RequestBody  ChangeStatusActiveCategoriaDTO dto) {
        categoriaService.changeStatusCategoria(dto);
        return ResponseEntity.noContent().build();
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @PutMapping("/change-products-to-another-category")
    public ResponseEntity<String> changeProductsToAnotherCategory(
            @RequestBody ChangeProductsToAnotherCategoryDTO dto){
        return ResponseEntity
                .status(200)
                .body(categoriaService.changeProductsToAnotherCategory(dto));
    }

    /**✅ FUNCIONAL IMPLEMENTADO EN EL FRONT*/
    @DeleteMapping("/{idCategoria}")
    public ResponseEntity<Boolean> deleteByIdCategoria(
            @PathVariable Short idCategoria){
        return ResponseEntity
                .status(200)
                .body(categoriaService.deleteCategoria(idCategoria));
    }

}
