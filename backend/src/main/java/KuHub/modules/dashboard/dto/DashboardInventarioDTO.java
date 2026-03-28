package KuHub.modules.dashboard.dto;

import java.util.List;

public record DashboardInventarioDTO(
    long totalProductos,
    double stockTotal,
    long productosBajoStock,
    long movimientosHoy,
    List<ProductoCriticoDTO> productosCriticos,
    List<ChartPointDTO> stockPorCategoria,
    List<ChartPointDTO> movimientosPorDia,
    List<ChartPointDTO> topProductosUsados,
    List<ChartPointDTO> topProductosMerma
) {}
