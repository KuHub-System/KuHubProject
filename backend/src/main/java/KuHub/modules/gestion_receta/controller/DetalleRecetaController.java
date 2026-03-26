package KuHub.modules.gestion_receta.controller;

import KuHub.modules.gestion_receta.entity.DetalleReceta;
import KuHub.modules.gestion_receta.exceptions.GestionRecetaException;
import KuHub.modules.gestion_receta.services.DetalleRecetaService;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Detalles de Recetas
 * Endpoints: /api/v1/detalle-receta
 * ⚠️ No está en uso directamente por el frontend actualmente.
 * El frontend gestiona los detalles de las recetas a través de los endpoints de RecetaController
 * (ver src/services/receta-service.ts).
 */
@RestController
@RequestMapping("/api/v1/detalle-receta")
@Validated
public class DetalleRecetaController {

    @Autowired
    private DetalleRecetaService detalleRecetaService;























    /**
     * Obtiene los detalles de un registro específico de detalle de receta por su ID.
     * ⚠️ Sin uso aparente en el frontend actual (se gestiona vía RecetaController).
     */
    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<DetalleReceta> findById(@PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(detalleRecetaService.findById(id));
    }

    /**
     * Obtiene todos los registros de detalles de recetas del sistema.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/find-all/")
    public ResponseEntity<Iterable<DetalleReceta>> findAll(){
        return ResponseEntity
                .status(200)
                .body(detalleRecetaService.findAll());
    }

    /**
     * Crea un nuevo registro de detalle de receta.
     * ⚠️ Sin uso aparente: El frontend usa los endpoints masivos en RecetaController.
     */
    @PostMapping("/create-details-recipe/")
    public ResponseEntity<DetalleReceta> save(@RequestBody DetalleReceta detalleReceta){
        return ResponseEntity
                .status(201)
                .body(detalleRecetaService.save(detalleReceta));
    }




    /**
     * Elimina un registro de detalle de receta por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable @NotNull Integer id) {
        try {
            detalleRecetaService.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (GestionRecetaException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            // opcional: log.error("Error eliminando detalleReceta id=" + id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
