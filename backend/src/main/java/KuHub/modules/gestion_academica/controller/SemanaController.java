package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.dtos.request.WeekGeneratorDTO;
import KuHub.modules.gestion_academica.dtos.request.WeeklyFilterForSolicitationDTO;
import KuHub.modules.gestion_academica.dtos.response.YearWithSemestersDTO;
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


    /** Obtiene los anios disponible del anio actual hace adelante para filtro
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/years-for-filter-week")
    public ResponseEntity<List<Short>> yearsForFilterWeek(){
        return ResponseEntity
                .status(200)
                .body(semanaService.yearsForFilterWeek());
    }

    /** Obtiene los periodos del anio y semestre existentes para cargar options
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/find-grouped-perions-academic")
    public ResponseEntity<List<YearWithSemestersDTO>> findGroupedPeriodsAcademic(){
        return ResponseEntity
                .status(200)
                .body(semanaService.findGroupedPeriodsAcademic());
    }

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


    /** Obtiene los las semanas por filtro de anio y semestre para el option de solicitud
     *  ✅ En uso: Endpoint consumido por el frontend.*/
    @PostMapping("/find-by-weekly-for-solicitation")
    public ResponseEntity<List<Semana>> findByWeeklyFilterForSolicitation(
            @Validated @RequestBody WeeklyFilterForSolicitationDTO request){
        return ResponseEntity
                .status(200)
                .body(semanaService.findByWeeklyFilterForSolicitation(request));
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
