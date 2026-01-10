package KuHub.modules.gestion_solicitud.dtos.proyeccion;

import java.time.LocalDate;

public interface SectionAvailabilityView {
    // Mapea a: AS id_seccion
    Integer getIdSeccion();
    // Mapea a: AS nombre_seccion
    String getNombreSeccion();
    // Mapea a: AS dia_semana
    String getDiaSemana();
    // Mapea a: AS fecha_calculada_final
    LocalDate getFechaCalculadaSolicitud();
    // Mapea a: AS mensaje_aviso
    String getMensajeAviso();
}
