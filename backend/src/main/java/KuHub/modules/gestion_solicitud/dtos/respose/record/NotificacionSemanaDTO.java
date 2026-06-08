package KuHub.modules.gestion_solicitud.dtos.respose.record;

import java.time.LocalDate;

public record NotificacionSemanaDTO(
        Integer idSemana,
        String nombreSemana,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        Integer anio,
        Integer semestre,
        Long cantidadPendientes
) {}
