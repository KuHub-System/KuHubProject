package KuHub.modules.gestion_notificacion.controller;

import KuHub.modules.gestion_notificacion.dtos.response.NotificacionResumenDTO;
import KuHub.modules.gestion_notificacion.service.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint unificado de notificaciones del header.
 * Devuelve las 5 secciones del panel en una sola consulta.
 * Las secciones que el rol del usuario no puede ver vienen como lista vacía.
 *
 * Ruta base: /api/v1/notificacion
 */
@RestController
@RequestMapping("/api/v1/notificacion")
public class NotificacionController {

    @Autowired
    private NotificacionService notificacionService;

    /**
     * Resumen completo de notificaciones para el usuario autenticado.
     *
     * GET /api/v1/notificacion/resumen
     * ✅ En uso: Consumido por obtenerResumenNotificaciones en notification-service.ts.
     */
    @GetMapping("/resumen")
    public ResponseEntity<NotificacionResumenDTO> obtenerResumen() {
        return ResponseEntity.status(200).body(notificacionService.obtenerResumen());
    }
}
