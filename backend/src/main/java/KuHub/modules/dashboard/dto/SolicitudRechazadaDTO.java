package KuHub.modules.dashboard.dto;

public record SolicitudRechazadaDTO(
    Integer idSolicitud,
    String motivo,
    String fechaSolicitada,
    String nombrePedidoSemanaBodega,
    String nombreAsignatura,
    String nombreSeccion,
    String nombreDocente
) {}
