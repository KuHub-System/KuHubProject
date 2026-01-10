package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.entity.Sala;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.SalaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sala")
public class SalaController {

    @Autowired
    private SalaService salaService;

    @GetMapping( "/find-by-id/{id}")
    public ResponseEntity<Sala> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(salaService.findById(id));
    }

    @GetMapping( "/find-all/")
    public ResponseEntity<List<Sala>> findAll(){
        return ResponseEntity
                .status(200)
                .body(salaService.findAll());
    }

    @GetMapping( "/find-all-active-rooms-true/")
    public ResponseEntity<List<Sala>> findAllActiveRoomsTrue (){
        return ResponseEntity
                .status(200)
                .body(salaService.findAllActiveRoomsTrue());
    }

    @PostMapping("/create-sala/")
    public ResponseEntity<Sala> save(@RequestBody Sala sala){
        return ResponseEntity
                .status(201)
                .body(salaService.save(sala));
    }

    @PutMapping("/update-sala/")
    public ResponseEntity<Sala> updateRoom(@RequestBody Sala sala){
        return ResponseEntity
                .status(200)
                .body(salaService.updateRoom(sala));
    }

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
