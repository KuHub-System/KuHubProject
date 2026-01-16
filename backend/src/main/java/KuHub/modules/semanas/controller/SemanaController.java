package KuHub.modules.semanas.controller;

import KuHub.modules.semanas.dtos.YearFilterRequestDTO;
import KuHub.modules.semanas.entity.Semana;
import KuHub.modules.semanas.service.SemanaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/semanas")
public class SemanaController {

    @Autowired
    private SemanaService semanaService;

    // Listar todos los tramos de semanas
    @GetMapping
    public ResponseEntity<List<Semana>> findAll() {
        return ResponseEntity.ok(semanaService.findAll());
    }

    @GetMapping( "/find-week-active-for-year/")
    public ResponseEntity<List<Semana>> findWeekActiveForYear(
            @RequestBody YearFilterRequestDTO yearEnd
    ){
        return ResponseEntity
                .status(200)
                .body(semanaService.findWeekActiveForYear(yearEnd));
    }

}
