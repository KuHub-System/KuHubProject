package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.record.ReservaActivaView;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.service.ReservaSalaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Reservas de Salas
 * Endpoints: /api/v1/reserva-sala
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/reserva-sala")
public class ReservaSalaController {

    @Autowired
    private ReservaSalaService reservaSalaService;

    /**
     * Obtiene todas las reservas de sala activas con datos desnormalizados.
     * ✅ En uso: Consumido por obtenerReservasActivasService en reserva-sala-service.ts (SeccionReservas).
     */
    @GetMapping("/find-all-active")
    public ResponseEntity<List<ReservaActivaView>> findAllActive() {
        log.info("GET /reserva-sala/find-all-active");
        return ResponseEntity
                .status(200)
                .body(reservaSalaService.findAllReservasActivas());
    }

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
