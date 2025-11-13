package KuHub.modules.inventario.controller;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateDTO;
import KuHub.modules.inventario.dtos.InventoryWithProductResponseAnswerUpdateDTO;
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


    /**crear inventario para el FrontEnd */
    @PostMapping("/create-inventory-with-product/")
    public ResponseEntity<InventoryWithProductCreateDTO> save(
            @Valid @RequestBody
            InventoryWithProductCreateDTO inventarioRequest){
        return ResponseEntity
                .status(201)
                .body(inventarioService.save(inventarioRequest));
    }

    /**actualizar inventario para el FrontEnd */
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

    /**actualizar el valor activo a false para realizar la eliminacion logica*/
    @PutMapping("/update-active-value-product-false/{id_inventario}")
    public ResponseEntity<Void> updateActiveValueProductFalse(
            @PathVariable Integer id_inventario){

            inventarioService.updateActiveValueProductFalse(id_inventario);

            return  ResponseEntity.status(200).build();
    }



}
