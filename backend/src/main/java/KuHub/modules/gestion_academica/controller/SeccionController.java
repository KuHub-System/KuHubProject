package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.dtoentity.SeccionEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.request.SectionUpdateDTO;
import KuHub.modules.gestion_academica.dtos.response.SectionAnswerUpdateDTO;
import KuHub.modules.gestion_academica.dtos.request.SectionCreateDTO;
import KuHub.modules.gestion_academica.entity.Seccion;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.SeccionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Secciones de Asignaturas
 * Endpoints: /api/v1/seccion
 * ✅ En uso: Este controlador permite la creación, actualización por delta (incluyendo bloques horarios) 
 * y eliminación lógica de secciones asociadas a una asignatura.
 * Consumido por asignatura-service.ts en el frontend.
 */
@RestController
@RequestMapping("/api/v1/seccion")
public class SeccionController {

    @Autowired
    private SeccionService seccionService;


    /**
     * Crea una nueva sección asociada a una asignatura.
     * ✅ En uso: Consumido por crearSeccionService en asignatura-service.ts.
     */
    @PostMapping( "/create-section")
    public ResponseEntity<Boolean> createSectionFrontend(
            @Validated @RequestBody SectionCreateDTO request
    ){
        return ResponseEntity
            .status(201)
            .body(seccionService.createSection(request));
    }

    /**
     * Actualiza la información, bloques horarios e ingredientes de una sección mediante deltas.
     * ✅ En uso: Consumido por actualizarSeccionService en asignatura-service.ts.
     */
    @PatchMapping("/update-section")
    public ResponseEntity<Boolean> updateSectionFrontend(
            @Validated @RequestBody SectionUpdateDTO request
    ) {
        return ResponseEntity
            .status(200)
            .body(seccionService.updateSection(request));
    }

    /**
     * Realiza la eliminación lógica (soft delete) de una sección.
     * ✅ En uso: Consumido por eliminarSeccionService en asignatura-service.ts.
     */
    @DeleteMapping("/soft-delete/{idSeccion}")
    public ResponseEntity<Boolean> softDelete(
            @PathVariable Integer idSeccion
    ){
        return ResponseEntity
                .status(204)
                .body(seccionService.softDelete(idSeccion));
    }


















    /**
    @GetMapping( "/find-by-id/{id}")
    public ResponseEntity<SeccionEntityResponseDTO> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(seccionService.findById(id));
    }

    @GetMapping( "/find-by-id-and-seccion-active-is-true/{id}")
    public ResponseEntity<SeccionEntityResponseDTO> findByIdAndSeccionActiveIsTrue(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(seccionService.findByIdAndActiveIsTrueResponseDTO(id));
    }

    @GetMapping( "/find-by-section-by-id-seccion/{idSeccion}")
    public ResponseEntity<SectionAnswerUpdateDTO> findBySectionByIdSeccion (
            @PathVariable Integer idSeccion
    ){
        return ResponseEntity
                .status(200)
                .body(seccionService.findBySectionByIdSeccion(idSeccion));
    }

    @GetMapping( "/find-all/")
    public ResponseEntity<List<SeccionEntityResponseDTO>> findAll(){
        return ResponseEntity
                .status(200)
                .body(seccionService.findAll());
    }

    @GetMapping( "/find-all-by-activo-true/")
    public ResponseEntity<List<SeccionEntityResponseDTO>> findAllByActivoTrue(){
        return ResponseEntity
                .status(200)
                .body(seccionService.findAllByActivoTrue());
    }

    @PostMapping("/create-seccion/")
    public ResponseEntity<SeccionEntityResponseDTO> save(@RequestBody Seccion seccion){
        return ResponseEntity
                .status(201)
                .body(seccionService.save(seccion));
    }



    @PutMapping( "/update-seccion-frontend/")
    public ResponseEntity<SectionAnswerUpdateDTO> updateSectionFrontend(
            @RequestBody SectionAnswerUpdateDTO sectionAnswerUpdateDTO
    ){
        return ResponseEntity
                .status(200)
                .body(seccionService.updateSection(sectionAnswerUpdateDTO));
    }*/




}
