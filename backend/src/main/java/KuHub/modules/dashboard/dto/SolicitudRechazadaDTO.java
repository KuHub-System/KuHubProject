package KuHub.modules.dashboard.dto;

public record SolicitudRechazadaDTO(
    Integer idSolicitud,
    String motivo,
    String fechaSolicitada,
    String nombreReceta,
    String nombreAsignatura,
    String nombreSeccion,
    String nombreDocente
) {}
