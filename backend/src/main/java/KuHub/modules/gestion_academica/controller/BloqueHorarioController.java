package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.dtomodel.FilterTimeBlockRequestDTO;
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

    @GetMapping("/find-by-id/{id}")
    public ResponseEntity<BloqueHorario> findById(
            @PathVariable Integer id
    ){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.findById(id));
    }


    @GetMapping( "/find-all")
    public ResponseEntity<List<BloqueHorario>> findAll(){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.findAll());
    }

    @GetMapping( "/filter-by-numbers-blocks/{numbersBlocksFilter}")
    public ResponseEntity<List<BloqueHorario>> filterBlocksByNumbersBlocks(
            @PathVariable List<Integer> numbersBlocksFilter
    ){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.filterBlocksByNumbersBlocks(numbersBlocksFilter));
    }

    @PostMapping( "/filter-by-day-week-and-id-room/")
    public ResponseEntity<List<BloqueHorario>> filterBlocksDayWeekAndIdRoom(
            @RequestBody FilterTimeBlockRequestDTO filterTimeBlockRequestDTO
            ){
        return ResponseEntity
                .status(200)
                .body(bloqueHorarioService.filterBlocksByDayWeekAndIdRoom(filterTimeBlockRequestDTO));
    }
}
