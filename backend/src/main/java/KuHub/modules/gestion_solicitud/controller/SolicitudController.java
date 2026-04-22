package KuHub.modules.gestion_solicitud.controller;

import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatus;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.CourseForSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.DashboardConsolidado;
import KuHub.modules.gestion_solicitud.dtos.respose.record.ProyeccionAbastecimiento;
import KuHub.modules.gestion_solicitud.dtos.request.*;
import KuHub.modules.gestion_solicitud.dtos.respose.projection.ResultsMassSolicitationView;
import KuHub.modules.gestion_solicitud.dtos.respose.record.RecipeSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.SolicitationManagement;
import KuHub.modules.gestion_solicitud.service.SolicitudService;
import KuHub.config.security.service.DynamicPermissionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Solicitudes
 * Endpoints: /api/v1/solicitud
 * ✅ En uso: Este controlador maneja la lógica de solicitudes masivas, carga de cursos/recetas
 * para solicitudes y vista semanal consolidada.
 * Es consumido por solicitud-service.ts en el frontend.
 */
@RestController
@RequestMapping("/api/v1/solicitud")
@Validated
public class SolicitudController {

    @Autowired
    private SolicitudService solicitudService;

    @Autowired
    private DynamicPermissionService dynamicPermissionService;

    /**
     * Obtiene todas las asignaturas con sus secciones y bloques horarios activos (con reserva de sala).
     * ✅ En uso: Consumido por obtenerCursosParaSolicitudService en solicitud-service.ts.
     */
    @GetMapping("/curses-by-solicitation")
    public ResponseEntity<List<CourseForSolicitation>> findCourseWithSectionsAndBlocksActive() {
        return ResponseEntity
                .status(200)
                .body(solicitudService.findCourseWithSectionsAndBlocksRaw());
    }

    /**
     * Obtiene la lista de recetas activas incluyendo el detalle de sus insumos.
     * ✅ En uso: Consumido por obtenerRecetasSolicitudService en solicitud-service.ts.
     */
    @GetMapping("/recipes-with-details-by-solicitation")
    public ResponseEntity<List<RecipeSolicitation>> findActiveRecipesWithDetails() {
        return ResponseEntity
                .status(200)
                .body(solicitudService.findActiveRecipesWithDetailsRaw());
    }

    /**
     * Obtiene el listado de solicitudes para un rango de fechas (vista semanal),
     * incluyendo jerarquía de asignatura, sección y horarios.
     * ✅ En uso: Consumido por obtenerSolicitudesPorSemanaService en solicitud-service.ts.
     */
    @PostMapping("/find-solicitations-per-week")
    public ResponseEntity<List<SolicitationManagement>> findSolicitationsPerWeek(
            @Valid @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(solicitudService.findSolicitationsPerWeekRaw(request));
    }

    /**
     * Procesa la creación masiva de solicitudes para múltiples secciones y horarios.
     * ✅ En uso: Consumido por generarSolicitudesMasivasService en solicitud-service.ts.
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

    /**
     * Obtiene los datos consolidados de solicitudes (dashboard) para un rango de fechas.
     * ✅ En uso: Consumido por obtenerOrdenConsolidationService en solicitud-service.ts.
     */
    @PostMapping("/order-for-consolidation")
    public ResponseEntity<DashboardConsolidado> obtenerDashboard(
            @Validated @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(solicitudService.obtenerDashboard(request));
    }

    /**
     * Realiza el cambio de estado masivo para un conjunto de solicitudes (Aceptar/Rechazar).
     * ✅ En uso: Consumido por cambiarEstadoMasivoService en solicitud-service.ts.
     */
    @PatchMapping("/change-massive-status")
    public ResponseEntity<Boolean> changeMassiveStatus(
            @Validated @RequestBody ChangeSolicitationStatus request) {
        return ResponseEntity
                .status(200)
                .body(solicitudService.changeMassiveStatus(request));
    }

    /**
     * Obtiene la proyección de abastecimiento consolidada de productos cuyas solicitudes
     * tienen estado EN_PEDIDO, filtradas por rango de fechas.
     * Agrupa por categoría y nombre de producto, sumando cantidades totales solicitadas.
     * ✅ En uso: Consumido por cargarProyeccionAbastecimiento en inventario.tsx (Abastecimiento por Pedido).
     * Requiere permiso de LECTURA o ESCRITURA en el módulo INVENTARIO.
     */
    @PostMapping("/proyeccion-abastecimiento")
    public ResponseEntity<ProyeccionAbastecimiento> findProyeccionAbastecimiento(
            @Validated @RequestBody DateRangeDTO request,
            Authentication authentication) {
        // Validación dinámica de permisos: requiere lectura o escritura en INVENTARIO
        if (!dynamicPermissionService.check(authentication, "INVENTARIO", "read") &&
            !dynamicPermissionService.check(authentication, "INVENTARIO", "write")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity
                .status(200)
                .body(solicitudService.findProyeccionAbastecimiento(request));
    }

}
