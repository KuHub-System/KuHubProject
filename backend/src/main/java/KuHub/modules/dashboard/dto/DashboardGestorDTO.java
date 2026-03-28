package KuHub.modules.dashboard.dto;

import java.util.List;

public record DashboardGestorDTO(
    long totalSolicitudes,
    long pendientes,
    long aceptadas,
    long procesadas,
    long rechazadas,
    double tiempoPromedioHoras,
    List<ChartPointDTO> solicitudesPorAsignatura,
    List<PieSliceDTO> solicitudesPorEstado,
    List<SolicitudRechazadaDTO> rechazadasRecientes
) {}
