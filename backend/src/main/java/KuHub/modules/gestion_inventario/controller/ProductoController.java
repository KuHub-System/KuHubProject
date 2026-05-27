package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductRecipeView;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductRecipeWithCategoryView;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.services.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Productos
 * Endpoints: /api/v1/producto
 * ✅ En uso parcial: La mayoría de las funciones de inventario se gestionan a través de InventarioController.
 * Este controlador se usa principalmente para obtener la lista de productos activos para selección en recetas
 * (endpoint /find-all-product-active-for-option).
 */
@RestController
@RequestMapping("/api/v1/producto")
@Validated
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    /**
     * Obtiene el listado de todos los productos, sin filtrar por estado de activación.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping
    public ResponseEntity<List<Producto>> findAllProducts(){
        return ResponseEntity
                .status(200)
                .body(productoService.findAll());
    }

    /**
     * Obtiene la lista de productos activos optimizada para selección en la creación de recetas.
     * ✅ En uso: Consumido por obtenerProductosOpcionService en solicitud-service.ts.
     */
    @GetMapping("/find-all-product-active-for-option")
    public ResponseEntity<List<ProductRecipeView>> findAllActiveForRecipe() {
        return ResponseEntity
                .status(200)
                .body(productoService.findAllActiveForRecipe());
    }

    /**
     * Igual que find-all-product-active-for-option pero incluye idCategoria y nombreCategoria.
     * ✅ En uso: Consumido por obtenerProductosOpcionConCategoriaService en solicitud-service.ts (filtro de categorías en solicitud).
     */
    @GetMapping("/find-all-product-active-for-option-with-category")
    public ResponseEntity<List<ProductRecipeWithCategoryView>> findAllActiveForRecipeWithCategory() {
        return ResponseEntity
                .status(200)
                .body(productoService.findAllActiveForRecipeWithCategory());
    }

    /**
     * Filtra productos según su estado de activación (Activo/Inactivo).
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/all-value-active/{activo}")
    public ResponseEntity<List<Producto>> findByActive(@PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(productoService.findByActivo(activo));
    }

    /**
     * Obtiene un producto específico mediante su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/id/{id}")
    public ResponseEntity<Producto> findProductById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(productoService.findById(id));
    }

    /**
     * Obtiene un producto por su ID solo si se encuentra activo.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/find-product-by-id-active/{id_producto}")
    public ResponseEntity<Producto> findProductByIdAndActive(
            @PathVariable Integer id_producto) {
        return ResponseEntity
                .status(200)
                .body(productoService.findByIdProductoAndActivoTrue(id_producto));
    }

    /**
     * Busca un producto por su nombre exacto.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/nombre/{nombreProducto}")
    public ResponseEntity<Producto> findProductoByName(@PathVariable String nombreProducto){
        return ResponseEntity
                .status(200)
                .body(productoService.findByNombreProducto(nombreProducto));
    }

    /**
     * Busca un producto por nombre y estado de activación.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/nombre-activo/{nombreProducto}/{activo}")
    public ResponseEntity<Producto> findProductoByNameAndActivo(
            @PathVariable String nombreProducto,
            @PathVariable Boolean activo){
        return ResponseEntity
                .status(200)
                .body(productoService.findByNombreProductoAndActivo(nombreProducto, activo));
    }

    /**
     * Crea un nuevo producto en el sistema.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PostMapping
    public ResponseEntity<Producto> save(@RequestBody Producto producto){
        return ResponseEntity
                .status(201)
                .body(productoService.save(producto));
    }

    /**
     * Realiza una eliminación lógica de un producto buscando por su nombre.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
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

    /**
     * Realiza una eliminación lógica de un producto buscando por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
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
