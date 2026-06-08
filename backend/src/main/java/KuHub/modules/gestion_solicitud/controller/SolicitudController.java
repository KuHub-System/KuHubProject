package KuHub.modules.gestion_solicitud.controller;

import KuHub.modules.gestion_solicitud.dtos.request.record.ChangeSolicitationStatus;
import KuHub.modules.gestion_solicitud.dtos.request.record.MassiveSolicitation;
import KuHub.modules.gestion_solicitud.dtos.request.record.RejectEnPedidoDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.CourseForSolicitation;
import KuHub.modules.gestion_solicitud.dtos.respose.record.DashboardConsolidado;
import KuHub.modules.gestion_solicitud.dtos.respose.record.AbastecimientoBodegaDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;
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
import java.util.Map;

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
     * Retorna el conteo de solicitudes con estado PENDIENTE para el panel de notificaciones.
     * ✅ En uso: Consumido por notification-service.ts (polling cada 60s en el header).
     */
    @GetMapping("/notificacion-pendientes")
    public ResponseEntity<Long> contarPendientes() {
        return ResponseEntity
                .status(200)
                .body(solicitudService.contarPendientes());
    }

    /**
     * Retorna solicitudes PENDIENTES agrupadas por semana académica para el dropdown de notificaciones.
     * Cada elemento incluye idSemana, nombreSemana, fechas, anio, semestre y cantidad de pendientes.
     * ✅ En uso: Consumido por notification-service.ts (polling en header).
     */
    @GetMapping("/notificacion-pendientes-lista")
    public ResponseEntity<List<NotificacionSemanaDTO>> obtenerNotificacionesPorSemana() {
        return ResponseEntity.ok(solicitudService.obtenerNotificacionesPorSemana());
    }

    /**
     * Retorna solicitudes ACEPTADAS (aún no consolidadas en pedido) agrupadas por semana.
     * Se usa cuando solicitudesEnPedido = false para alertar al gestor de consolidación manual.
     * ✅ En uso: Consumido por notification-service.ts (polling en header).
     */
    @GetMapping("/notificacion-aceptadas-lista")
    public ResponseEntity<List<NotificacionSemanaDTO>> obtenerNotificacionesAceptadasPorSemana() {
        return ResponseEntity.ok(solicitudService.obtenerNotificacionesAceptadasPorSemana());
    }

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
     * Si se pasa idAsignatura filtra por asignatura en BD; si es null retorna todas.
     * ✅ En uso: Consumido por obtenerRecetasSolicitudService en solicitud-service.ts.
     */
    @GetMapping("/recipes-with-details-by-solicitation")
    public ResponseEntity<List<RecipeSolicitation>> findActiveRecipesWithDetails(
            @RequestParam(required = false) Integer idAsignatura) {
        return ResponseEntity
                .status(200)
                .body(solicitudService.findActiveRecipesWithDetailsRaw(idAsignatura));
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
     * Rechaza una solicitud en estado EN_PEDIDO, restando automáticamente sus cantidades del pedido
     * asociado y desvinculándola del mismo. Solo se permite si el pedido no tiene una Orden de Pedido
     * vigente (estado distinto a CANCELADA); de lo contrario lanza excepción de negocio.
     * ✅ En uso: Consumido por rechazarSolicitudEnPedidoService en solicitud-service.ts.
     */
    @PatchMapping("/reject-en-pedido")
    public ResponseEntity<Boolean> rechazarSolicitudEnPedido(
            @Validated @RequestBody RejectEnPedidoDTO request) {
        return ResponseEntity
                .status(200)
                .body(solicitudService.rechazarSolicitudEnPedido(request));
    }

    /**
     * Retorna solicitudes EN_PEDIDO con sus productos de categorías INVENTARIO, para precargar
     * en Control de Stock Masivo con tipo TRASLADO (inventario → bodega de tránsito).
     * ✅ En uso: Consumido por obtenerAbastecimientoBodegaService en solicitud-service.ts.
     * Requiere permiso de LECTURA en el módulo INVENTARIO.
     */
    @PostMapping("/abastecimiento-bodega")
    public ResponseEntity<?> obtenerAbastecimientoBodega(
            @Validated @RequestBody DateRangeDTO request,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "INVENTARIO", "read") &&
                !dynamicPermissionService.check(authentication, "INVENTARIO", "write")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para acceder a esta funcionalidad"));
            }
            AbastecimientoBodegaDTO resultado = solicitudService.obtenerAbastecimientoBodega(request);
            return ResponseEntity.status(200).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al obtener abastecimiento de bodega", "message", e.getMessage()));
        }
    }

    /**
     * Marca los DetalleSolicitud indicados como enviadoBodegaTransito = true.
     * ✅ En uso: Consumido por marcarEnviadoBodegaService en solicitud-service.ts.
     * Requiere permiso de ESCRITURA en el módulo INVENTARIO.
     */
    @PatchMapping("/detalles/marcar-enviado-bodega")
    public ResponseEntity<?> marcarEnviadosBodega(
            @RequestBody List<Integer> ids,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "INVENTARIO", "write")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para marcar abastecimiento de bodega"));
            }
            int updated = solicitudService.marcarEnviadosBodega(ids);
            return ResponseEntity.status(200).body(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al marcar enviados a bodega", "message", e.getMessage()));
        }
    }

}
