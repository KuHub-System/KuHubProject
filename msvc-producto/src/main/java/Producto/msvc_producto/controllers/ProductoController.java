package Producto.msvc_producto.controllers;

import Producto.msvc_producto.dtos.ProductoUpdateRequest;
import Producto.msvc_producto.exceptions.ProductoException;
import Producto.msvc_producto.models.entity.Categoria;
import Producto.msvc_producto.models.entity.Producto;
import Producto.msvc_producto.services.ProductoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

//porto de la aplicacion 8081
@RestController
@RequestMapping("/api/v1/producto")
@Validated
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    //Metodos creado solamente para acceder los productos por client rest para la solicitude.

    @GetMapping
    public ResponseEntity<List<Producto>> findAllProductos(){
        return ResponseEntity
                .status(200)
                .body(productoService.findAll());
    }

    @GetMapping("/id/{id}")
    public ResponseEntity<Producto> findProductoById(@PathVariable Long id){
        return ResponseEntity
                .status(200)
                .body(productoService.findById(id));
    }

    @GetMapping("/nombre/{nombreProducto}")
    public ResponseEntity<Producto> findProductoByName(@PathVariable String nombreProducto){
        return ResponseEntity
                .status(200)
                .body(productoService.findByNombreProducto(nombreProducto));
    }

    @PostMapping
    public ResponseEntity<Producto> createProducto(@Valid @RequestBody Producto producto){
        return ResponseEntity
                .status(201)
                .body(productoService.save(producto));
    }

    @PutMapping("/nombreProductoActual/{nombreProductoActual}")
    public ResponseEntity<Producto> updateProductoByName(
            @PathVariable String nombreProductoActual,
            @Validated @RequestBody ProductoUpdateRequest productoUpdateRequest) {
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



    //PARA DELETAR PRODUCTO HAY QUE VALIDAR QUE ESTE NO ESTE EN UNA SOLICITUD DE UN DOCENTE E INVENTARIO
    @DeleteMapping("/nombreProductoActual/{nombreProductoActual}")
    public ResponseEntity<?> deleteProductoByName(@PathVariable String nombreProductoActual) {
        try {
            productoService.deleteByName(nombreProductoActual);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (ProductoException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error inesperado: " + e.getMessage());
        }
    }

    @DeleteMapping("/id/{id}")
    public ResponseEntity<?> deleteProductoById(@PathVariable Long id) {
        try {
            productoService.deleteById(id);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (ProductoException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error inesperado: " + e.getMessage());
        }
    }
    //Crear metodo al futuro para deletar en cascada, por gestor ADMIN borrando detalles de todos los productos en DetalleReceta y DetalleProducto



    //Lo quiero para Checkear en el Inventario que existe el producto
    //Ingresa el producto desde un nombre preseleccionado en el Frontend por lo que entendi
    @GetMapping("/idByNombreProducto/{nombreProducto}")
    public ResponseEntity<Producto> getIdByNombreProducto(@PathVariable String nombreProducto) {
        return ResponseEntity.ok(productoService.findByNombreProducto(nombreProducto));
    }

    @PostMapping("/buscar-por-ids") // Lo utilizo en Inventario
    public List<Producto> obtenerPorIds(@RequestBody List<Long> ids) {
        return productoService.findByIds(ids);
    }

    //Metodos nuevos agregados debido a Categorias

    @GetMapping("/categoria-idProducto/{idProducto}")
    public ResponseEntity<Categoria> findCategoriaByIdProducto(@PathVariable Long idProducto){
        return ResponseEntity
                .status(200)
                .body(this.productoService.findCategoriaByIdProducto(idProducto));
    }

    @GetMapping("/categoria-nombreProducto/{nombreProducto}")
    public ResponseEntity<Categoria> findCategoriaByNombreProducto(String nombreProducto){
        return ResponseEntity
                .status(200)
                .body(this.productoService.findCategoriaByNombreProducto(nombreProducto));
    }
    @GetMapping("/listaProductos-idCategoria/{idCategoria}")
    public ResponseEntity<List<Producto>> findByCategoriaIdCategoria(@PathVariable Long idCategoria){
        return ResponseEntity
                .status(200)
                .body(productoService.findByCategoriaIdCategoria(idCategoria));
    };
}
