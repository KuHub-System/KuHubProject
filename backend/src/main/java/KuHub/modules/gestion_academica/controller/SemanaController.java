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

/**
 * Controller REST para gestión de Semanas Académicas
 * Endpoints: /api/v1/semanas
 * ✅ En uso: Este controlador gestiona la definición de las semanas académicas del semestre, 
 * permitiendo la generación automática del calendario y el filtrado por año y periodo.
 * Consumido por semana-service.ts en el frontend.
 */
@RestController
@RequestMapping("/api/v1/semanas")
public class SemanaController {

    @Autowired
    private SemanaService semanaService;


    /**
     * Obtiene los años disponibles (del actual en adelante) para el filtro de semanas.
     * ✅ En uso: Consumido por obtenerAniosFiltroService en semana-service.ts.
     */
    @GetMapping("/years-for-filter-week")
    public ResponseEntity<List<Short>> yearsForFilterWeek(){
        return ResponseEntity
                .status(200)
                .body(semanaService.yearsForFilterWeek());
    }

    /**
     * Obtiene los periodos académicos existentes (año y semestres) para cargar opciones.
     * ✅ En uso: Consumido por obtenerPeriodosAcademicosService en semana-service.ts.
     */
    @GetMapping("/find-grouped-perions-academic")
    public ResponseEntity<List<YearWithSemestersDTO>> findGroupedPeriodsAcademic(){
        return ResponseEntity
                .status(200)
                .body(semanaService.findGroupedPeriodsAcademic());
    }

    /**
     * Obtiene el listado completo de semanas filtradas por un año específico.
     * ✅ En uso: Consumido por obtenerSemanasService en semana-service.ts.
     */
    @PostMapping("/find-all-by-year/{year}")
    public ResponseEntity<List<Semana>> findAllByYear(
            @PathVariable Short year
    ) {
        return ResponseEntity
            .status(200)
            .body(semanaService.findAllByYear(year));
    }


    /**
     * Obtiene las semanas filtradas por año y semestre para la creación de solicitudes.
     * ✅ En uso: Consumido por obtenerSemanasPorPeriodoService en semana-service.ts.
     */
    @PostMapping("/find-by-weekly-for-solicitation")
    public ResponseEntity<List<Semana>> findByWeeklyFilterForSolicitation(
            @Validated @RequestBody WeeklyFilterForSolicitationDTO request){
        return ResponseEntity
                .status(200)
                .body(semanaService.findByWeeklyFilterForSolicitation(request));
    }


    /**
     * Genera automáticamente las 18 semanas de un semestre académico a partir de una fecha inicial.
     * ✅ En uso: Consumido por generarCalendarioService en semana-service.ts.
     */
    @PostMapping("/generate-semester-calendar")
    public ResponseEntity<Boolean> generateSemesterCalendar(
            @Validated @RequestBody WeekGeneratorDTO request){
        return ResponseEntity
                .status(200)
                .body(semanaService.generateSemesterCalendar(request));
    }



}
