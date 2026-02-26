package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.dto.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoriesPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryFiltersDTO;
import KuHub.modules.gestion_inventario.services.InventarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

//Porto du Phonk ahora 8080
@RestController
@Validated
@RequestMapping("/api/v1/inventario")
public class InventarioController {

    @Autowired
    private InventarioService inventarioService;

    /**
     * 🔹 Combos de filtros (categorías + unidades)
     * Usado al cargar la página de inventario
    * ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/filters")
    public ResponseEntity<InventoryFiltersDTO> getFiltersInventory() {
        return ResponseEntity
                .status(200)
                .body(inventarioService.getFiltersInventory());
    }

    /**
     * 🔍 Búsqueda de inventario
     */
    @PostMapping("/search-inventory")
    public ResponseEntity<InventoriesPageDTO> searchInventory(
            @RequestBody SearchDTO searchRequest
    ) {
        return ResponseEntity.ok(
                inventarioService.searchInventory(
                        searchRequest.getTerm(),
                        searchRequest.getPage()
                )
        );
    }

    /**
     * 📦 Inventario paginado con filtros
     */
    @PostMapping("/paged-inventory")
    public ResponseEntity<InventoriesPageDTO> getPagedInventory(
            @RequestBody FilterInventoryPageDTO filter
    ) {
        return ResponseEntity.status(200)
                .body(inventarioService.getPagedInventory(filter));
    }

    /**
     * 🔍 Búsqueda de inventario por código de producto
     */
    @PostMapping("/search-inventory-by-code")
    public ResponseEntity<InventoriesPageDTO> searchInventoryByCodProducto(
            @RequestBody SearchDTO searchRequest
    ){
        return ResponseEntity
            .status(201)
            .body(
            inventarioService.searchInventoryByCodProducto(
                searchRequest.getTerm(), // acá el term es el código
                searchRequest.getPage()
            )
        );
    }

    /** Crear inventario para el FrontEnd*/
     @PostMapping("/create-inventory-with-product")
        public ResponseEntity<Boolean> saveInventoryWithProduct(
         @Valid @RequestBody
         InventoryWithProductCreateDTO inventarioRequest){
             return ResponseEntity
                 .status(201)
                 .body(inventarioService.saveInventoryWithProduct(inventarioRequest));
     }

    /**
    @GetMapping("/{id}")
    public ResponseEntity<Inventario> findById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findById(id));
    }

    @GetMapping("/id-activo/{id}/{activo}")
    public ResponseEntity<Inventario>findByIdInventoryWithProductActive(
            @PathVariable Integer id,
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
    public ResponseEntity<List<Inventario>> findInventoriesWithProductsActive(@PathVariable Boolean activo ){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findInventoriesWithProductsActive(activo));
    }

    @GetMapping("/find-all-inventories-active/")
    public ResponseEntity<List<InventoryWithProductResponseAnswerUpdateDTO>> findAllActiveInventoryOrderedByName(){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findAllActiveInventoryOrderedByName());
    }




    /**actualizar inventario para el FrontEnd
    @PutMapping("/update-inventory-with-product/")
    public ResponseEntity<InventoryWithProductResponseAnswerUpdateDTO> updateInventoryWithProduct(
            @RequestBody InventoryWithProductResponseAnswerUpdateDTO inventarioRequest){

        if (inventarioRequest.getIdInventario() == null) {
            // Lanza un error 400 (Bad Request)
            throw new IllegalArgumentException("El ID de Inventario es requerido para la actualización.");
        }

        return ResponseEntity
                .status(200)
                .body(inventarioService.updateInventoryWithProduct(inventarioRequest));
    }

    /**actualizar el valor activo a false para realizar la eliminacion logica
    @PutMapping("/update-active-value-product-false/{id_inventario}")
    public ResponseEntity<Void> updateActiveValueProductFalse(
            @PathVariable Integer id_inventario){

            inventarioService.updateActiveValueProductFalse(id_inventario);

            return  ResponseEntity.status(200).build();
    }

    */

}
