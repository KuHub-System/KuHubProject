package KuHub.modules.gestion_academica.dtos.record;

import KuHub.modules.gestion_academica.entity.ReservaSala;

/**
 * Transporta el resultado de la validación y el Enum procesado
 * para evitar re-normalizar el texto.
 */
public record CheckAvailability(
        boolean isAvailable,
        ReservaSala.DiaSemana enumDay
) {}
