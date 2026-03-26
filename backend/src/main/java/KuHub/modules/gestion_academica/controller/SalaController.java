package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.entity.Sala;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.SalaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Salas
 * Endpoints: /api/v1/sala
 * ✅ En uso: Este controlador permite listar las salas activas para la asignación de horarios 
 * a las secciones.
 * Consumido por sala-service.ts y ramos-admin.tsx en el frontend.
 */
@RestController
@RequestMapping("/api/v1/sala")
public class SalaController {

    @Autowired
    private SalaService salaService;

    /**
     * Obtiene el listado de todas las salas que se encuentran activas en el sistema.
     * ✅ En uso: Consumido por el frontend para la asignación de salas a bloques horarios.
     */
    @GetMapping( "/find-all-active")
    public ResponseEntity<List<Sala>> findAllActiveRoomsTrue(){
        return ResponseEntity
                .status(200)
                .body(salaService.findAllActiveRoomsTrue());
    }


















    /**
     * Obtiene la información detallada de una sala específica por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping( "/find-by-id/{id}")
    public ResponseEntity<Sala> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(salaService.findById(id));
    }



    /**
     * Registra una nueva sala en el sistema.
     * ⚠️ Sin uso aparente en el frontend actual (gestión interna).
     */
    @PostMapping("/create-sala/")
    public ResponseEntity<Sala> save(@RequestBody Sala sala){
        return ResponseEntity
                .status(201)
                .body(salaService.save(sala));
    }

    /**
     * Actualiza la información de una sala existente.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PutMapping("/update-sala/")
    public ResponseEntity<Sala> updateRoom(@RequestBody Sala sala){
        return ResponseEntity
                .status(200)
                .body(salaService.updateRoom(sala));
    }

    /**
     * Realiza una eliminación lógica (soft delete) de una sala.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PutMapping("/soft-delete/{id}")
    public ResponseEntity<?> softDelete(
            @PathVariable Integer id
    ) {
        try {
            salaService.softDelete(id);
            return ResponseEntity.noContent().build();

        } catch (GestionAcademicaException e) {
            return ResponseEntity.status(400)
                    .body("Error: " + e.getMessage());

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body("Error interno al intentar eliminar la sala: " + e.getMessage());
        }
    }
}
