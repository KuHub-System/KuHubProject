package KuHub.modules.gestion_notificacion.service;

import KuHub.modules.gestion_notificacion.dtos.response.NotificacionResumenDTO;

public interface NotificacionService {

    /**
     * Devuelve el resumen completo de notificaciones para el usuario autenticado.
     * Cada sección retorna lista vacía cuando el usuario no tiene el rol requerido.
     */
    NotificacionResumenDTO obtenerResumen();
}
