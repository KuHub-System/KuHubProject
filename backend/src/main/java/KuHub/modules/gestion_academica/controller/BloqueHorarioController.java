package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.request.FilterTimeBlockDTO;
import KuHub.modules.gestion_academica.entity.BloqueHorario;
import KuHub.modules.gestion_academica.service.BloqueHorarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bloque-horario")
public class BloqueHorarioController {

    @Autowired
    private BloqueHorarioService bloqueHorarioService;

    /**
     * ultilizado en crear y editar seccion
     *
     ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping( "/find-all")
    public ResponseEntity<List<BloqueHorario>> findAll(){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.findAll());
    }

    /**
     * ultilizado en crear y editar seccion para obtener los bloques de horarios
     * que estan disponibles que no esta reservados con el activo true de ReservaSala
     *
     ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping( "/filter-by-day-week-and-id-room")
    public ResponseEntity<List<BloqueHorario>> filterBlocksDayWeekAndIdRoom(
            @RequestBody FilterTimeBlockDTO request
    ){
        return ResponseEntity
            .status(200)
            .body(bloqueHorarioService.filterBlocksByDayWeekAndIdRoom(request));
    }















    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<BloqueHorario> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.findById(id));
    }




    @GetMapping( "/filter-by-numbers-blocks/{numbersBlocksFilter}")
    public ResponseEntity<List<BloqueHorario>> filterBlocksByNumbersBlocks(
            @PathVariable List<Integer> numbersBlocksFilter
    ){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.filterBlocksByNumbersBlocks(numbersBlocksFilter));
    }


}
