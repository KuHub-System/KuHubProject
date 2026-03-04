package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.dto.*;
import KuHub.modules.gestion_inventario.dtos.response.InventoriesPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryFiltersDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryPageDTO;
import KuHub.modules.gestion_inventario.services.InventarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
       ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping("/search-inventory")
    public ResponseEntity<InventoriesPageDTO> searchInventory(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(inventarioService.searchInventory(
                        request.getTerm(),
                        request.getPage()
            )
        );
    }

    /**
     * 📦 Inventario paginado con filtros
       ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping("/paged-inventory")
    public ResponseEntity<InventoriesPageDTO> getPagedInventory(
            @RequestBody FilterInventoryPageDTO request
    ) {
        return ResponseEntity.status(200)
                .body(inventarioService.getPagedInventory(request));
    }

    /**
     * 🔍 Búsqueda de inventario por código de producto
       ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping("/search-inventory-by-code")
    public ResponseEntity<InventoriesPageDTO> searchInventoryByCodProducto(
            @RequestBody SearchDTO request
    ){
        return ResponseEntity
            .status(201)
            .body(
            inventarioService.searchInventoryByCodProducto(
                    request.getTerm(), // acá el term es el código
                    request.getPage()
            )
        );
    }

    /** Crear inventario para el FrontEnd
     * ✅ En uso: Endpoint consumido por el frontend.*/
     @PostMapping("/create-inventory-with-product")
        public ResponseEntity<Boolean> saveInventoryWithProduct(
         @Valid @RequestBody
         InventoryWithProductCreateDTO request){
             return ResponseEntity
                 .status(201)
                 .body(inventarioService.saveInventoryWithProduct(request));
     }

    /** Metodo que realiza en el btn de guarda en editar inventario, donde realiza esta petion y en seguida el patch
     *  Metodo hibrido de control antes de update, verefica si el inventario a actulizar no fue eliminado en paralelo,
     *  verefica si el stock de inventario fue actualizado por otro usuario en paralelo retornando el objeto en caso de que esta alterado,
     *  el frontend actualiza el formulario de editar y el iten de la lista en caso de que cierre el modal y vea los cambios.
     *  si no se cumple las validaciones es porque no actualizan en paralo podiendo proceder con el patch de actualizar
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping("/validate-stock-before-updating")
    public ResponseEntity<?> validateStockBeforeUpdating(
            @Validated @RequestBody ValidateInventoryStockDTO request) {
        Object result = inventarioService.validateStockBeforeUpdating(request);

        /**Si nos retorna un inventario es porque hubo un conflicto de update en paralelo,
         * Retornamos con 409 y el objeto para actualizar la vista*/
        if (result instanceof InventoryPageDTO) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(result);
        }
        return ResponseEntity.ok(result);
    }

    /**Actualiza inventario con producto, creando movimiento segun tipo, una vez validado
     * ✅ En uso: Endpoint consumido por el frontend.*/
     @PatchMapping("/update-inventory-with-product")
        public ResponseEntity<Boolean> updateInventoryWithProduct(
             @Validated @RequestBody InventoryWithProductUpdateDTO request){
         return ResponseEntity
                     .status(200)
                     .body(inventarioService.updateInventoryWithProduct(request));
     }

     /**Desactiva el estado actvio si el stock es 0
      * ✅ En uso: Endpoint consumido por el frontend.*/
    @DeleteMapping("/soft-delete-inventory-with-product/{idInventario}")
        public ResponseEntity<Boolean> softDeleteInventoryWithProduct(
                @PathVariable Integer idInventario){
         return ResponseEntity
                 .status(204)
                 .body(inventarioService.softDeleteByInventoryWithProduct(idInventario));
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
