package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.request.FilterTimeBlockDTO;
import KuHub.modules.gestion_academica.entity.BloqueHorario;
import KuHub.modules.gestion_academica.service.BloqueHorarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Bloques Horarios
 * Endpoints: /api/v1/bloque-horario
 * ✅ En uso: Este controlador permite listar todos los bloques horarios y filtrar 
 * aquellos disponibles (no reservados) para una sala y día específicos.
 * Consumido por bloque-horario-service.ts y ramos-admin.tsx en el frontend.
 */
@RestController
@RequestMapping("/api/v1/bloque-horario")
public class BloqueHorarioController {

    @Autowired
    private BloqueHorarioService bloqueHorarioService;

    /**
     * Obtiene el listado de todos los bloques horarios configurados en el sistema.
     * ✅ En uso: Consumido por el frontend para mostrar las opciones de horario.
     */
    @GetMapping( "/find-all")
    public ResponseEntity<List<BloqueHorario>> findAll(){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.findAll());
    }

    /**
     * Filtra los bloques horarios disponibles para una sala y día de la semana específicos, 
     * excluyendo aquellos que ya tienen reservas activas.
     * ✅ En uso: Consumido por el frontend al asignar horarios a una sección.
     */
    @PostMapping( "/filter-by-day-week-and-id-room")
    public ResponseEntity<List<BloqueHorario>> filterBlocksDayWeekAndIdRoom(
            @RequestBody FilterTimeBlockDTO request
    ){
        return ResponseEntity
            .status(200)
            .body(bloqueHorarioService.filterBlocksByDayWeekAndIdRoom(request));
    }















    /**
     * Obtiene la información de un bloque horario específico por su ID.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<BloqueHorario> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.findById(id));
    }




    /**
     * Filtra bloques horarios basándose en una lista de números de bloques.
     * ⚠️ Sin uso aparente en el frontend actual.
     */
    @GetMapping( "/filter-by-numbers-blocks/{numbersBlocksFilter}")
    public ResponseEntity<List<BloqueHorario>> filterBlocksByNumbersBlocks(
            @PathVariable List<Integer> numbersBlocksFilter
    ){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.filterBlocksByNumbersBlocks(numbersBlocksFilter));
    }


}
