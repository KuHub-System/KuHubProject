package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.service.ReservaSalaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reserva-sala")
public class ReservaSalaController {

    @Autowired
    private ReservaSalaService reservaSalaService;

    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<ReservaSalaEntityResponseDTO> findById(
            @PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(reservaSalaService.findById(id));
    }

    @GetMapping( "/find-all/")
    public ResponseEntity<List<ReservaSalaEntityResponseDTO>> findAll(){
        return ResponseEntity
                .status(200)
                .body(reservaSalaService.findAll());
    }

    @GetMapping("/find-reserved-blocks-ids")
    public ResponseEntity<List<Integer>> findReservedBlocksIds(
            @RequestParam Integer idSala,
            @RequestParam String diaSemana
    ){
        return ResponseEntity
                .status(200)
                .body(reservaSalaService.findReservedBlocksByIdSalaAndDayWeek(idSala, diaSemana));
    }

    @PostMapping("/create-reserva-sala/")
    public ResponseEntity<ReservaSalaEntityResponseDTO> save(ReservaSala reservaSala){
        return ResponseEntity
                .status(201)
                .body(reservaSalaService.save(reservaSala));
    }

}
