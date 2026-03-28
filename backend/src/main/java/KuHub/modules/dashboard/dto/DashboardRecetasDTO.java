package KuHub.modules.dashboard.dto;

import java.util.List;

public record DashboardRecetasDTO(
    long recetasActivas,
    long recetasInactivas,
    long recetasTotal,
    List<ChartPointDTO> topIngredientes,
    List<PieSliceDTO> recetasPorEstado
) {}
