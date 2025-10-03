package msvc_Inventario.controller;


import msvc_Inventario.dtos.InventarioDTO;
import msvc_Inventario.dtos.InventarioUpdateDTO;
import msvc_Inventario.models.entities.Inventario;
import msvc_Inventario.models.Producto;
import msvc_Inventario.services.InventarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

//Porto du Phonk 8085
@RestController
@Validated
@RequestMapping("/api/v1/inventario")
public class InventarioController {

    @Autowired
    private InventarioService inventarioService;

    @GetMapping("/{id}")
    public ResponseEntity<InventarioDTO> findById(@PathVariable Long id){
        return ResponseEntity.ok().body(this.inventarioService.findById(id));
    }

    @PostMapping
    public ResponseEntity<InventarioDTO> save(@Validated @RequestBody InventarioDTO inventarioDTO){
        return ResponseEntity.ok().body(this.inventarioService.save(inventarioDTO));
    }

    @GetMapping
    public ResponseEntity<List<InventarioDTO>> findAll(){
        return ResponseEntity.ok().body(this.inventarioService.findAll());
    }

    @GetMapping("/getinventario/{idProducto}")
    public ResponseEntity<Inventario> getInventarioByIdProducto(@PathVariable Long idProducto){
        return ResponseEntity.ok().body(this.inventarioService.getInventarioByIdProducto(idProducto));
    }

    @GetMapping("/getproducto/{idInventario}")
    public ResponseEntity<Producto> getProductoByIdInventario(@PathVariable Long idInventario){
        return ResponseEntity.ok().body(this.inventarioService.findProductoByIdInventario(idInventario));
    }

    @PutMapping("/{id}/update-total") // Endpoint que no contiene la cantidad
    public ResponseEntity<Void> updateTotalInventario(@PathVariable Long id, @RequestBody InventarioUpdateDTO totalInventario) { // Recibe el JSON

        inventarioService.updateTotalInventario(id, totalInventario.getTotalInventario());
        return ResponseEntity.ok().build();
    }
}
