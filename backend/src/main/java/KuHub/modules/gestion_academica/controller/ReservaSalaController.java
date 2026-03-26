package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.service.ReservaSalaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Reservas de Salas
 * Endpoints: /api/v1/reserva-sala
 * ⚠️ No está en uso directamente por el frontend actualmente.
 * El frontend gestiona las reservas y la disponibilidad a través de BloqueHorarioController.
 */
@RestController
@RequestMapping("/api/v1/reserva-sala")
public class ReservaSalaController {

    @Autowired
    private ReservaSalaService reservaSalaService;

    /**
     * Obtiene una reserva específica por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<ReservaSalaEntityResponseDTO> findById(
            @PathVariable Integer id){
        return ResponseEntity
                .status(200)
                .body(reservaSalaService.findById(id));
    }

    /**
     * Obtiene el listado completo de todas las reservas.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping( "/find-all/")
    public ResponseEntity<List<ReservaSalaEntityResponseDTO>> findAll(){
        return ResponseEntity
                .status(200)
                .body(reservaSalaService.findAll());
    }

    /**
     * Busca los IDs de bloques reservados para una sala y día específico.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/find-reserved-blocks-ids")
    public ResponseEntity<List<Integer>> findReservedBlocksIds(
            @RequestParam Integer idSala,
            @RequestParam String diaSemana
    ){
        return ResponseEntity
                .status(200)
                .body(reservaSalaService.findReservedBlocksByIdSalaAndDayWeek(idSala, diaSemana));
    }

    /**
     * Crea una nueva reserva de sala.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @PostMapping("/create-reserva-sala/")
    public ResponseEntity<ReservaSalaEntityResponseDTO> save(ReservaSala reservaSala){
        return ResponseEntity
                .status(201)
                .body(reservaSalaService.save(reservaSala));
    }

}
