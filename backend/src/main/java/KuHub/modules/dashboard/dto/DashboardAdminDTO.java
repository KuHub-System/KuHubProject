package KuHub.modules.dashboard.dto;

import java.util.List;

public record DashboardAdminDTO(
    long solicitudesToday,
    long solicitudesWeek,
    long solicitudesMonth,
    long totalPedidos,
    long productosBajoStock,
    long usuariosActivos,
    long solicitudesPendientes,
    List<PieSliceDTO> solicitudesPorEstado,
    List<ChartPointDTO> solicitudesPorDia,
    List<ChartPointDTO> pedidosPorSemana
) {}
