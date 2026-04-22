package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.request.SalaCreateDTO;
import KuHub.modules.gestion_academica.dtos.request.SalaUpdateDTO;
import KuHub.modules.gestion_academica.entity.Sala;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.SalaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Salas
 * Endpoints: /api/v1/sala
 * ✅ En uso: Consumido por sala-service.ts (listado activas) y admin-sistema.tsx (CRUD).
 */
@Slf4j
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
     * Registra una nueva sala validando los campos con DTO.
     * ✅ En uso: Consumido por crearSalaService en sala-service.ts (SeccionGestionSalas).
     */
    @PostMapping("/create")
    public ResponseEntity<Sala> create(@Validated @RequestBody SalaCreateDTO dto) {
        log.info("POST /sala/create — codSala: {}", dto.getCodSala());
        Sala nueva = new Sala();
        nueva.setCodSala(dto.getCodSala());
        nueva.setNombreSala(dto.getNombreSala());
        return ResponseEntity.status(201).body(salaService.save(nueva));
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
     * Actualiza cod_sala y nombre_sala de una sala existente por su ID.
     * ✅ En uso: Consumido por actualizarSalaService en sala-service.ts (SeccionGestionSalas).
     */
    @PatchMapping("/update/{id}")
    public ResponseEntity<Sala> update(@PathVariable Integer id, @Validated @RequestBody SalaUpdateDTO dto) {
        log.info("PATCH /sala/update/{} — codSala: {}", id, dto.getCodSala());
        Sala s = new Sala();
        s.setIdSala(id);
        s.setCodSala(dto.getCodSala());
        s.setNombreSala(dto.getNombreSala());
        return ResponseEntity.status(200).body(salaService.updateRoom(s));
    }

    /**
     * Realiza una eliminación lógica (soft delete) de una sala sin validar reservas.
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
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno: " + e.getMessage());
        }
    }

    /**
     * Eliminación lógica de sala con validación: falla con 409 si tiene reservas activas.
     * ✅ En uso: Consumido por eliminarSalaService en sala-service.ts (SeccionGestionSalas).
     */
    @DeleteMapping("/soft-delete/{id}")
    public ResponseEntity<?> softDeleteWithValidation(@PathVariable Integer id) {
        log.info("DELETE /sala/soft-delete/{}", id);
        salaService.softDeleteWithValidation(id);
        return ResponseEntity.status(204).build();
    }
}
