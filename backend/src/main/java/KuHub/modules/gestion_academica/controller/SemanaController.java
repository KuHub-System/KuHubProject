package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.YearFilterRequestDTO;
import KuHub.modules.gestion_academica.dtos.request.WeekGeneratorDTO;
import KuHub.modules.gestion_academica.entity.Semana;
import KuHub.modules.gestion_academica.service.SemanaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/semanas")
public class SemanaController {

    @Autowired
    private SemanaService semanaService;

    /** Busca semanas por filtro
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping("/find-all-by-year/{year}")
    public ResponseEntity<List<Semana>> findAllByYear(
            @PathVariable Short year
    ) {
        return ResponseEntity
            .status(200)
            .body(semanaService.findAllByYear(year));
    }

    /** Otiene los anios disponible del anio actual hace adelante para filtro
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/years-for-filter-week")
    public ResponseEntity<List<Short>> yearsForFilterWeek(){
        return ResponseEntity
                .status(200)
                .body(semanaService.yearsForFilterWeek());
    }


    @GetMapping( "/find-week-active-for-year/")
    public ResponseEntity<List<Semana>> findWeekActiveForYear(
            @RequestBody YearFilterRequestDTO yearEnd
    ){
        return ResponseEntity
                .status(200)
                .body(semanaService.findWeekActiveForYear(yearEnd));
    }

    /** Crear 18 semanas en cascada con una unica fecha Lunes para la consistencia
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping("/generate-semester-calendar")
    public ResponseEntity<Boolean> generateSemesterCalendar(
            @Validated @RequestBody WeekGeneratorDTO request){
        return ResponseEntity
                .status(200)
                .body(semanaService.generateSemesterCalendar(request));
    }

}
