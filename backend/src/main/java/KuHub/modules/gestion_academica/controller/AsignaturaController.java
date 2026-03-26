package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.request.CourseCreateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourseSolicitationResponseDTO;
import KuHub.modules.gestion_academica.dtos.request.CourseUpdateDTO;
import KuHub.modules.gestion_academica.dtos.response.CourserPageDTGOD;
import KuHub.modules.gestion_academica.entity.Asignatura;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.AsignaturaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Asignaturas
 * Endpoints: /api/v1/asignatura
 * ✅ En uso: Este controlador gestiona el CRUD de asignaturas, incluyendo la visualización 
 * paginada con sus secciones y bloques horarios asociados.
 * Consumido por asignatura-service.ts en el frontend.
 */
@RestController
@RequestMapping("/api/v1/asignatura")
public class AsignaturaController {

    @Autowired
    private AsignaturaService asignaturaService;

    /**
     * Obtiene el listado paginado de asignaturas activas, incluyendo sus secciones y bloques horarios.
     * ✅ En uso: Consumido por obtenerAsignaturasService en asignatura-service.ts.
     */
    @PostMapping( "/find-all-courses-active-true/{page}")
    public ResponseEntity<CourserPageDTGOD> findAllCourserActiveTrueWithSeccion(
            @PathVariable Integer page
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findAllCourserActiveTrueWithSeccion(page));
    }

    /**
     * Crea una nueva asignatura en el sistema.
     * ✅ En uso: Consumido por crearAsignaturaService en asignatura-service.ts.
     */
    @PostMapping( "/create-course")
    public ResponseEntity<Boolean> createCourse(
            @Validated @RequestBody CourseCreateDTO courseCreateDTO
    ){
        return ResponseEntity
                .status(201)
                .body(asignaturaService.createCourse(courseCreateDTO));
    }

    /**
     * Actualiza la información básica de una asignatura existente.
     * ✅ En uso: Consumido por actualizarAsignaturaService en asignatura-service.ts.
     */
    @PatchMapping("/update-course")
    public ResponseEntity<Boolean> updateCourser(
            @Validated @RequestBody CourseUpdateDTO request
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.updateCourser(request));
    }

    /**
     * Realiza la eliminación lógica (soft delete) de una asignatura.
     * ✅ En uso: Consumido por eliminarAsignaturaService en asignatura-service.ts.
     */
    @DeleteMapping("/soft-delete/{idAsignatura}")
    public ResponseEntity<Boolean> softDeleteCourse(
            @PathVariable Integer idAsignatura
    ){
        return ResponseEntity
                .status(204)
                .body(asignaturaService.softDeleteCourse(idAsignatura));
    }



    /**
     * Obtiene la información detallada de una asignatura por su ID.
     * ⚠️ Sin uso aparente: El frontend filtra el listado existente por ID.
     */
    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<Asignatura> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findById(id));
    }

    /**
     * Obtiene el listado completo de todas las asignaturas.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping( "/find-all/")
    public ResponseEntity<List<Asignatura>> findAll(){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findAll());
    }



    /**
     * Obtiene un listado simplificado de asignaturas para el flujo de solicitudes.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/find-all-courses-for-solicitation")
    public ResponseEntity<List<CourseSolicitationResponseDTO>> findAllCoursesForSolicitation(){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findCourserForSolicitation());
    }

    /**
     * Registra una asignatura en el sistema (Legacy).
     * ⚠️ Sin uso aparente: Se prefiere create-course.
     */
    @PostMapping("/create-asignatura/")
    public ResponseEntity<Asignatura> save(@RequestBody Asignatura asignatura){
        return ResponseEntity
                .status(201)
                .body(asignaturaService.save(asignatura));
    }
















}
