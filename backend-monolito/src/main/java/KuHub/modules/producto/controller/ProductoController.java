package KuHub.modules.producto.controller;

import KuHub.modules.producto.dto.ProductoUpdateRequest;
import KuHub.modules.producto.entity.Producto;
import KuHub.modules.producto.exceptions.ProductoException;
import KuHub.modules.producto.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/producto")
@Validated
public class ProductoController {

    @Autowired
    private ProductoService productoService;


    /**Listar todos los productos independente de los valores activo TRUE/FALSE */
    @GetMapping
    public ResponseEntity<List<Producto>> findAllProductos(){
        return ResponseEntity
                .status(200)
                .body(productoService.findAll());
    }

    /**Listar todos los productos segun el valor activo TRUE/FALSE */
    @GetMapping("/activo/{activo}")
    public ResponseEntity<List<Producto>> findByActivo(@PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(productoService.findByActivo(activo));
    }

    /**Lista producto independente del valor activo TRUE/FALSE*/
    @GetMapping("/id/{id}")
    public ResponseEntity<Producto> findProductoById(@PathVariable Long id){
        return ResponseEntity
                .status(200)
                .body(productoService.findById(id));
    }

    /**Lista producto segun el valor activo TRUE/FALSE*/
    @GetMapping("/id-activo/{id}/{activo}")
    public ResponseEntity<Producto> findProductoByIdAndActivo(
            @PathVariable Long id,
            @PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(productoService.findByIdProductoAndActivo(id, activo));
    }

    /**Lista producto por nombre independente del valor activo TRUE/FALSE*/
    @GetMapping("/nombre/{nombreProducto}")
    public ResponseEntity<Producto> findProductoByName(@PathVariable String nombreProducto){
        return ResponseEntity
                .status(200)
                .body(productoService.findByNombreProducto(nombreProducto));
    }

    /**Lista producto por nombre segun del valor activo TRUE/FALSE*/
    @GetMapping("/nombre-activo/{nombreProducto}/{activo}")
    public ResponseEntity<Producto> findProductoByNameAndActivo(
            @PathVariable String nombreProducto,
            @PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(productoService.findByNombreProductoAndActivo(nombreProducto, activo));
    }

    @PostMapping
    public ResponseEntity<Producto> save(@RequestBody Producto producto){
        return ResponseEntity
                .status(201)
                .body(productoService.save(producto));
    }

    @PutMapping("/nombreProductoActual/{nombreProductoActual}")
    public ResponseEntity<Producto> updateProductoByName(
            @PathVariable String nombreProductoActual,
            @RequestBody ProductoUpdateRequest productoUpdateRequest){
        return ResponseEntity
                .status(200)
                .body(productoService.updateByName(nombreProductoActual, productoUpdateRequest));
    }

    @PutMapping("/id/{id}")
    public ResponseEntity<Producto> updateProductoById(
            @PathVariable Long id,
            @Validated @RequestBody ProductoUpdateRequest productoUpdateRequest){
        return ResponseEntity
                .status(200)
                .body(productoService.updateById(id, productoUpdateRequest));
    }

    /**Eliminacion logica por nombre producto actualizando el producto activo a FALSE*/
    @PutMapping("solf-delete/nombre-producto/{nombreProducto}")
    public ResponseEntity<String> deleteProductoByName(@PathVariable String nombreProducto){
        try {
            productoService.deleteByName(nombreProducto);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (ProductoException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error inesperado: " + e.getMessage());
        }
    }

    /**Eliminacion logica por id producto actualizando el producto activo a FALSE*/
    @PutMapping("solf-delete/id/{id}")
    public ResponseEntity<String> deleteProductoById(@PathVariable Long id){
        try {
            productoService.deleteById(id);
        } catch (ProductoException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error inesperado: " + e.getMessage());
        }
        return null;
    }



}
