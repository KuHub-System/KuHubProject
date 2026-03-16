package KuHub.modules.gestion_solicitud.controller;

import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatus;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.CourseForSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.DashboardConsolidado;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.projection.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.record.RecipeSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.SolicitationManagement;
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
     * ✅✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/curses-by-solicitation")
    public ResponseEntity<List<CourseForSolicitation>> findCourseWithSectionsAndBlocksActive(){
        return ResponseEntity
                .status(200)
                .body(solicitudService.findCourseWithSectionsAndBlocksRaw());
    }

    /**
     * ✅✅ En uso: Endpoint consumido por el frontend.*/
    @GetMapping("/recipes-with-details-by-solicitation")
    public ResponseEntity<List<RecipeSolicitation>> findActiveRecipesWithDetails(){
        return ResponseEntity
                .status(200)
                .body(solicitudService.findActiveRecipesWithDetailsRaw());
    }

    /**
     * Obtiene el listado completo de solicitudes con su jerarquía anidada
     * (Asignatura -> Sección -> Horarios) filtrando por un rango de fechas.
     * * DETALLES!!
     * ✅✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
     */
    @PostMapping("/find-solicitations-per-week")
    public ResponseEntity<List<SolicitationManagement>> findSolicitationsPerWeek(
            @Valid @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(solicitudService.findSolicitationsPerWeekRaw(request));
    }

    /** ✅✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
            */
    @PostMapping("/generate-mass-solicitions")
    public ResponseEntity<ResultsMassSolicitationView> generarSolicitudesMasivas(
            @Validated @RequestBody List<MassiveSolicitation> payloadList) {

        if (payloadList == null || payloadList.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity
                .status(201)
                .body(solicitudService.saveMass(payloadList));
    }

    /** ✅✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
     */
    @PostMapping("/order-for-consolidation")
    public ResponseEntity<DashboardConsolidado> obtenerDashboard(
            @Validated @RequestBody DateRangeDTO request){
        return ResponseEntity
                .status(200)
                .body(solicitudService.obtenerDashboard(request));
    }

    /** ✅✅ En uso: Endpoint consumido por el frontend para cargar la vista semanal de solicitudes.
     */
    @PatchMapping("/change-massive-status")
    public ResponseEntity<Boolean> changeMassiveStatus(
            @Validated @RequestBody ChangeSolicitationStatus request){
        return ResponseEntity
                .status(200)
                .body(solicitudService.changeMassiveStatus(request));
    }



}
