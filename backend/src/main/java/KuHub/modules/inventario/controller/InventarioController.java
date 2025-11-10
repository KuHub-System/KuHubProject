package KuHub.modules.inventario.controller;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;
import KuHub.modules.inventario.dtos.InventoryWithProductoResponseViewDTO;
import KuHub.modules.inventario.entity.Inventario;
import KuHub.modules.inventario.services.InventarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

//Porto du Phonk ahora 8080
@RestController
@Validated
@RequestMapping("/api/v1/inventario")
public class InventarioController {

    @Autowired
    private InventarioService inventarioService;

    @GetMapping("/{id}")
    public ResponseEntity<Inventario> findById(@PathVariable Long id){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findById(id));
    }

    @GetMapping("/id-activo/{id}/{activo}")
    public ResponseEntity<Inventario>findByIdInventoryWithProductActive(
            @PathVariable Long id,
            @PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findByIdInventoryWithProductActive(
                        id, activo)
                );
    }

    @GetMapping
    public ResponseEntity<List<Inventario>> findAll(){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findAll());
    }

    @GetMapping("/activo/{activo}")
    public ResponseEntity<List<Inventario>> findInventoriesWithProductsActive(@PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findInventoriesWithProductsActive(activo));
    }

    @GetMapping("/find-inventories-for-number-page-by-filter-categoria/{numberPage}/{nombreCategoria}")
    public ResponseEntity<List<InventoryWithProductoResponseViewDTO>> findInventoriesForNumberPageByFilterCategoria(
            @PathVariable Long numberPage,
            @PathVariable String nombreCategoria){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findInventariosForNumberPageByFilterCategoria(
                        numberPage, nombreCategoria
                ));
    }

    @GetMapping("/find-inventories-for-number-page-seach-similar-name/{numberPage}/{nombreProductoSimilar}")
    public ResponseEntity<List<InventoryWithProductoResponseViewDTO>> findInventariosForNumberPageSeachSimilarName(
            @PathVariable Long numberPage,
            @PathVariable String nombreProductoSimilar){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findInventariosForNumberPageSeachSimilarName(
                        numberPage, nombreProductoSimilar
                ));
    }
    //findInventariosForNumberPageSeachSimilarName
    //findInventoriesInProductsSimilarByNameWithPagination

    @GetMapping("/count-inventory-for-pagination-rows/{nombreCategoria}")
    public ResponseEntity<Long>  countInventoryForPaginationRowsByCategoria(@PathVariable String nombreCategoria){
        return ResponseEntity
                .status(200)
                .body(inventarioService.countInventoryForPaginationRowsByCategoria(nombreCategoria));
    }

    @GetMapping("/count-inventory-for-pagination-rows-seach-similar-name/{nombreProductoSimilar})")
    public ResponseEntity<Long> countInventoryForPaginationRowsSeachSimilarName(@PathVariable String nombreProductoSimilar){
        return ResponseEntity
                .status(200)
                .body(inventarioService.countInventoryForPaginationRowsSeachSimilarName(nombreProductoSimilar));
    }

    /**crear inventario para el FrontEnd */
    @PostMapping("/front-page/")
    public ResponseEntity<Inventario> save(
            @Valid @RequestBody
            InventoryWithProductCreateRequestDTO inventarioRequest){
        return ResponseEntity
                .status(200)
                .body(inventarioService.save(inventarioRequest));
    }




}
