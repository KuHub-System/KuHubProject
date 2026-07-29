package KuHub.modules.dashboard.dto;

import java.util.List;

public record DashboardPedidoSemanaBodegasDTO(
    long pedidoSemanaBodegasActivas,
    long pedidoSemanaBodegasInactivas,
    long pedidoSemanaBodegasTotal,
    List<ChartPointDTO> topIngredientes,
    List<PieSliceDTO> pedidoSemanaBodegasPorEstado
) {}
