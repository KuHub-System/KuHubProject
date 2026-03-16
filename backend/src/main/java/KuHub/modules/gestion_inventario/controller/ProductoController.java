package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductRecipeView;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.services.ProductoService;
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
    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    @GetMapping
    public ResponseEntity<List<Producto>> findAllProducts(){
        return ResponseEntity
                .status(200)
                .body(productoService.findAll());
    }

    /** Usado en option para crear receta
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/find-all-product-active-for-option")
    public ResponseEntity<List<ProductRecipeView>> findAllActiveForRecipe() {
        return ResponseEntity
                .status(200)
                .body(productoService.findAllActiveForRecipe());
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    /**Listar todos los productos segun el valor activo TRUE/FALSE */
    @GetMapping("/all-value-active/{activo}")
    public ResponseEntity<List<Producto>> findByActive(@PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(productoService.findByActivo(activo));
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    /**Lista producto independente del valor activo TRUE/FALSE*/
    @GetMapping("/id/{id}")
    public ResponseEntity<Producto> findProductById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(productoService.findById(id));
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    /**Lista producto segun el valor activo TRUE/FALSE*/
    @GetMapping("/find-product-by-id-active/{id_producto}")
    public ResponseEntity<Producto> findProductByIdAndActive(
            @PathVariable Integer id_producto) {
        return ResponseEntity
                .status(200)
                .body(productoService.findByIdProductoAndActivoTrue(id_producto));
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    /**Lista producto por nombre independente del valor activo TRUE/FALSE*/
    @GetMapping("/nombre/{nombreProducto}")
    public ResponseEntity<Producto> findProductoByName(@PathVariable String nombreProducto){
        return ResponseEntity
                .status(200)
                .body(productoService.findByNombreProducto(nombreProducto));
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    /**Lista producto por nombre segun del valor activo TRUE/FALSE*/
    @GetMapping("/nombre-activo/{nombreProducto}/{activo}")
    public ResponseEntity<Producto> findProductoByNameAndActivo(
            @PathVariable String nombreProducto,
            @PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(productoService.findByNombreProductoAndActivo(nombreProducto, activo));
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    @PostMapping
    public ResponseEntity<Producto> save(@RequestBody Producto producto){
        return ResponseEntity
                .status(201)
                .body(productoService.save(producto));
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    /**Eliminacion logica por nombre producto actualizando el producto activo a FALSE*/
    @PutMapping("soft-delete/nombre-producto/{nombreProducto}")
    public ResponseEntity<String> deleteProductoByName(@PathVariable String nombreProducto){
        try {
            productoService.deleteByName(nombreProducto);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (GestionInventarioException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error inesperado: " + e.getMessage());
        }
    }

    // ❌ Sin uso: Endpoint disponible pero actualmente no es consumido por el frontend.
    /**Eliminacion logica por id producto actualizando el producto activo a FALSE*/
    @PutMapping("soft-delete/id/{id}")
    public ResponseEntity<String> deleteProductoById(@PathVariable Integer id){
        try {
            productoService.deleteById(id);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (GestionInventarioException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error inesperado: " + e.getMessage());
        }
    }



}
