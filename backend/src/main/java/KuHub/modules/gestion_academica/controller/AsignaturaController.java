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

@RestController
@RequestMapping("/api/v1/asignatura")
public class AsignaturaController {

    @Autowired
    private AsignaturaService asignaturaService;

    /**
     * 🔍 Búsqueda de Asignatura con seccion paginada
     ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping( "/find-all-courses-active-true/{page}")
    public ResponseEntity<CourserPageDTGOD> findAllCourserActiveTrueWithSeccion(
            @PathVariable Integer page
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findAllCourserActiveTrueWithSeccion(page));
    }

    /**
     *  Usado apra crear asignatura
     ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping( "/create-course")
    public ResponseEntity<Boolean> createCourse(
            @Validated @RequestBody CourseCreateDTO courseCreateDTO
    ){
        return ResponseEntity
                .status(201)
                .body(asignaturaService.createCourse(courseCreateDTO));
    }

    /**
     *  Usado para actualizar asignatura
     ✅ En uso: Endpoint consumido por el frontend.*/
    @PatchMapping("/update-course")
    public ResponseEntity<Boolean> updateCourser(
            @Validated @RequestBody CourseUpdateDTO request
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.updateCourser(request));
    }

    /**
     *  Usado para delectar asignatura
     ✅ En uso: Endpoint consumido por el frontend.*/
    @DeleteMapping("/soft-delete/{idAsignatura}")
    public ResponseEntity<Boolean> softDeleteCourse(
            @PathVariable Integer idAsignatura
    ){
        return ResponseEntity
                .status(204)
                .body(asignaturaService.softDeleteCourse(idAsignatura));
    }



    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<Asignatura> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findById(id));
    }

    @GetMapping( "/find-all/")
    public ResponseEntity<List<Asignatura>> findAll(){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findAll());
    }



    @GetMapping("/find-all-courses-for-solicitation")
    public ResponseEntity<List<CourseSolicitationResponseDTO>> findAllCoursesForSolicitation(){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findCourserForSolicitation());
    }

    @PostMapping("/create-asignatura/")
    public ResponseEntity<Asignatura> save(@RequestBody Asignatura asignatura){
        return ResponseEntity
                .status(201)
                .body(asignaturaService.save(asignatura));
    }
















}
