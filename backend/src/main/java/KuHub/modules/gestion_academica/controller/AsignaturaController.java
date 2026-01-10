package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.dtomodel.CourseCreateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourseUpdateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourserAnswerDTGOD;
import KuHub.modules.gestion_academica.entity.Asignatura;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.AsignaturaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/asignatura")
public class AsignaturaController {

    @Autowired
    private AsignaturaService asignaturaService;

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

    @GetMapping( "/find-all-courses-active-true/")
    public ResponseEntity<List<CourserAnswerDTGOD>> findAllCourserActiveTrueWithSeccion(){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.findAllCourserActiveTrueWithSeccion());
    }

    @PostMapping("/create-asignatura/")
    public ResponseEntity<Asignatura> save(@RequestBody Asignatura asignatura){
        return ResponseEntity
                .status(201)
                .body(asignaturaService.save(asignatura));
    }

    @PostMapping( "/create-course/")
    public ResponseEntity<CourseCreateDTO> createCourse(
            @RequestBody CourseCreateDTO courseCreateDTO
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.createCourse(courseCreateDTO));
    }

    @PutMapping( "/update-course/")
    public ResponseEntity<CourseUpdateDTO> updateCourser(
            @RequestBody CourseUpdateDTO courseUpdateDTO
    ){
        return ResponseEntity
                .status(200)
                .body(asignaturaService.updateCourser(courseUpdateDTO));
    }

    @PutMapping( "/soft-delete-course/{id}")
    public ResponseEntity<?> softDeleteCourse(
            @PathVariable Integer id
    ){
        try {
            asignaturaService.softDeleteCourse(id);
            return ResponseEntity.noContent().build();
        }catch (GestionAcademicaException e){
            return ResponseEntity.status(400)
                    .body("Error: " + e.getMessage());
        }catch (Exception e){
            return ResponseEntity.status(500)
                    .body("Error interno al intentar eliminar la sala: " + e.getMessage());
        }
    }










}
