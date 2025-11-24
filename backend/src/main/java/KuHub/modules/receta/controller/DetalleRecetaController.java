package KuHub.modules.receta.controller;

import KuHub.modules.receta.entity.DetalleReceta;
import KuHub.modules.receta.exceptions.RecetaException;
import KuHub.modules.receta.services.DetalleRecetaService;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/detalle-receta")
@Validated
public class DetalleRecetaController {

    @Autowired
    private DetalleRecetaService detalleRecetaService;

    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<DetalleReceta> findById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(detalleRecetaService.findById(id));
    }

    @GetMapping("/find-all/")
    public ResponseEntity<Iterable<DetalleReceta>> findAll(){
        return ResponseEntity
                .status(200)
                .body(detalleRecetaService.findAll());
    }

    @PostMapping("/create-details-recipe/")
    public ResponseEntity<DetalleReceta> save(@RequestBody DetalleReceta detalleReceta){
        return ResponseEntity
                .status(201)
                .body(detalleRecetaService.save(detalleReceta));
    }

    @DeleteMapping("/receta/{idReceta}/productos")
    public ResponseEntity<Void> deleteByRecetaAndProductoIds(
            @PathVariable @NotNull Integer idReceta,
            @RequestBody @NotEmpty List<Integer> idsProducto
    ) {
        try {
            // valida lista vacía/NULL con anotaciones y también aquí por si acaso
            if (idsProducto == null || idsProducto.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            detalleRecetaService.deleteByRecetaAndProductoIds(idReceta, idsProducto);

            // 204: petición correcta, sin contenido
            return ResponseEntity.noContent().build();
        } catch (RecetaException ex) {
            // si tu service lanza RecetaException para indicar "no existe receta" o similar
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            // opcional: log.error("...", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable @NotNull Integer id) {
        try {
            detalleRecetaService.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (RecetaException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            // opcional: log.error("Error eliminando detalleReceta id=" + id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
