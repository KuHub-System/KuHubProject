package KuHub.modules.gestion_notificacion.dtos.response;

import KuHub.modules.gestion_orden_pedido.dtos.response.NotificacionEntregaDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;

import java.util.List;

/**
 * Respuesta unificada del resumen de notificaciones.
 * Cada lista viene vacía si el usuario no tiene acceso a esa sección (rol insuficiente).
 */
public record NotificacionResumenDTO(
        List<NotificacionSemanaDTO> solicitudesPendientes,
        List<NotificacionSemanaDTO> solicitudesAceptadas,
        List<NotificacionSemanaDTO> pedidosPendientes,
        List<NotificacionSemanaDTO> pedidosSinOp,
        List<NotificacionEntregaDTO> entregasHoyAyer
) {}
