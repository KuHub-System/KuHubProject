package KuHub.modules.gestion_solicitud.controller;

import KuHub.modules.gestion_solicitud.dtos.*;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.ManagementSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.proyeccion.SectionAvailabilityView;
import KuHub.modules.gestion_solicitud.dtos.record.DashboardConsolidadoResponse;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.SolicitationManagementDTO;
import KuHub.modules.gestion_solicitud.service.SolicitudService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/solicitud")
@Validated
public class SolicitudController {

    @Autowired
    private SolicitudService solicitudService;

    /**Carga todas las asignaturar con todas las secciones,con al menos una seccion activa con horarios reservados a una sala
     * ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/curses-by-solicitation")
    public ResponseEntity<List<CourseForSolicitationDTO>> findCourseWithSectionsAndBlocksActive(){
        return ResponseEntity
                .status(200)
                .body(solicitudService.findCourseWithSectionsAndBlocksRaw());
    }

    /**
     * ✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/recipes-with-details-by-solicitation")
    public ResponseEntity<List<RecipeSolicitationDTO>> findActiveRecipesWithDetails(){
        return ResponseEntity
                .status(200)
                .body(solicitudService.findActiveRecipesWithDetailsRaw());
    }

    /**
     * Obtiene el listado completo de solicitudes con su jerarquía anidada
     * (Asignatura -> Sección -> Horarios) filtrando por un rango de fechas.
     * * DETALLES!!
     * ✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
     */
    @PostMapping("/find-solicitations-per-week")
    public ResponseEntity<List<SolicitationManagementDTO>> findSolicitationsPerWeek(
            @Valid @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(solicitudService.findSolicitationsPerWeekRaw(request));
    }

    /** ✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
            */
    @PostMapping("/generate-mass-solicitions")
    public ResponseEntity<ResultsMassSolicitationView> generarSolicitudesMasivas(
            @Validated @RequestBody List<MassiveSolicitationDTO> payloadList) {

        if (payloadList == null || payloadList.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity
                .status(201)
                .body(solicitudService.saveMass(payloadList));
    }

    /** ✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
     */
    @PostMapping("/order-for-consolidation")
    public ResponseEntity<DashboardConsolidadoResponse> obtenerDashboard(
            @Validated @RequestBody DateRangeDTO request){
        return ResponseEntity
                .status(200)
                .body(solicitudService.obtenerDashboard(request));
    }

    /** ✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
     */
    @PatchMapping("/change-massive-status")
    public ResponseEntity<Boolean> changeMassiveStatus(
            @Validated @RequestBody ChangeSolicitationStatusDTO request){
        return ResponseEntity
                .status(200)
                .body(solicitudService.changeMassiveStatus(request));
    }

    /**
    @PostMapping("/management-solicitations-filter")
    public ResponseEntity<List<ManagementSolicitationView>> getManagementSolicitations(
            @RequestBody ManagementFilterRequestDTO filter
    ) {

        return ResponseEntity
                .status(200)
                .body(solicitudService.findManagementSolicitations(filter));
    }

    @GetMapping("/selectors-for-management-solicitation") // OJO: Escribe bien "management" esta vez
    public ResponseEntity<ManagementSolicitationSelectorsDTO> getSelectorsForManagement() {
        ManagementSolicitationSelectorsDTO selectors = solicitudService.getSelectorsForManagement();
        return ResponseEntity.ok(selectors);
    }

    @PostMapping("/check-section-availability")
    public ResponseEntity<List<SectionAvailabilityView>> checkSectionAvailability(
            @RequestBody CheckSectionAvailabilityRequestDTO r
            ){
        return ResponseEntity
                .status(200)
                .body(solicitudService.checkSectionAvailability(r));
    }


    @PostMapping("/save-solicitation")
    public ResponseEntity<Void> saveSolicitation(
            @RequestBody SolicitationCreateRequestDTO r
            ){
        solicitudService.saveSolicitation(r);
        return ResponseEntity
                .status(201)
                .build();
    }

    @PatchMapping("/update-solicitation-status")
    public ResponseEntity<Void> updateSolicitationStatus(
            @RequestBody @Valid SolicitationStatusUpdateDTO dto
    ) {
        solicitudService.updateSolicitationStatus(dto);
        // Retornamos 204 No Content: Todo salió bien, no hay cuerpo que devolver.
        return ResponseEntity.status(204).build();
    }*/


}
