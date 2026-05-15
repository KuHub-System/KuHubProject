package KuHub.modules.dashboard.service;

import KuHub.modules.dashboard.dto.*;
import KuHub.modules.dashboard.repository.DashboardRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DashboardServiceImpl implements DashboardService {

    @Autowired
    private DashboardRepository dashboardRepository;

    // ── HELPER ─────────────────────────────────────────────────────────────────

    private List<PieSliceDTO> buildEstadoPie(Map<String, Long> estadoMap) {
        String[][] estados = {
            {"PENDIENTE",  "#FFB800"},
            {"ACEPTADA",   "#22C55E"},
            {"PROCESADO",  "#3B82F6"},
            {"EN_PEDIDO",  "#8B5CF6"},
            {"RECHAZADA",  "#EF4444"}
        };
        List<PieSliceDTO> result = new ArrayList<>();
        for (String[] e : estados) {
            long count = estadoMap.getOrDefault(e[0], 0L);
            result.add(new PieSliceDTO(e[0].charAt(0) + e[0].substring(1).toLowerCase(), count, e[1]));
        }
        return result;
    }

    // ── ADMIN ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public DashboardAdminDTO getDashboardAdmin() {
        log.info("Fetching admin dashboard data");

        long solicitudesToday    = dashboardRepository.countSolicitudesToday();
        long solicitudesWeek     = dashboardRepository.countSolicitudesWeek();
        long solicitudesMonth    = dashboardRepository.countSolicitudesMonth();
        long totalPedidos        = dashboardRepository.countTotalPedidos();
        long productosBajoStock  = dashboardRepository.countProductosBajoStock();
        long usuariosActivos     = dashboardRepository.countUsuariosActivos();

        // Build estado map for pie + extract pendientes count
        Map<String, Long> estadoMap = dashboardRepository.getSolicitudesPorEstado().stream()
            .collect(Collectors.toMap(
                r -> (String) r[0],
                r -> ((Number) r[1]).longValue()
            ));
        long solicitudesPendientes = estadoMap.getOrDefault("PENDIENTE", 0L);
        List<PieSliceDTO> solicitudesPorEstado = buildEstadoPie(estadoMap);

        // Solicitudes por dia (last 30 days)
        List<ChartPointDTO> solicitudesPorDia = dashboardRepository.getSolicitudesPorDia().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());

        // Pedidos por semana — reverse to show oldest first
        List<ChartPointDTO> pedidosPorSemana = dashboardRepository.getPedidosPorSemana().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());
        Collections.reverse(pedidosPorSemana);

        return new DashboardAdminDTO(
            solicitudesToday,
            solicitudesWeek,
            solicitudesMonth,
            totalPedidos,
            productosBajoStock,
            usuariosActivos,
            solicitudesPendientes,
            solicitudesPorEstado,
            solicitudesPorDia,
            pedidosPorSemana
        );
    }

    // ── INVENTARIO ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public DashboardInventarioDTO getDashboardInventario() {
        log.info("Fetching inventario dashboard data");

        Object[] kpis = dashboardRepository.getInventarioKpis();
        long totalProductos     = ((Number) kpis[0]).longValue();
        double stockTotal       = ((Number) kpis[1]).doubleValue();
        long productosBajoStock = ((Number) kpis[2]).longValue();
        long movimientosHoy     = dashboardRepository.countMovimientosHoy();

        List<ProductoCriticoDTO> productosCriticos = dashboardRepository.getProductosCriticos().stream()
            .map(r -> new ProductoCriticoDTO(
                (String)  r[0],
                          ((Number) r[1]).doubleValue(),
                r[2] != null ? ((Number) r[2]).doubleValue() : 0.0,
                (String)  r[3],
                (String)  r[4]
            ))
            .collect(Collectors.toList());

        List<ChartPointDTO> stockPorCategoria = dashboardRepository.getStockPorCategoria().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());

        List<ChartPointDTO> movimientosPorDia = dashboardRepository.getMovimientosPorDia().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());

        List<ChartPointDTO> topProductosUsados = dashboardRepository.getTopProductosUsados().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());

        List<ChartPointDTO> topProductosMerma = dashboardRepository.getTopProductosMerma().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());

        return new DashboardInventarioDTO(
            totalProductos,
            stockTotal,
            productosBajoStock,
            movimientosHoy,
            productosCriticos,
            stockPorCategoria,
            movimientosPorDia,
            topProductosUsados,
            topProductosMerma
        );
    }

    // ── GESTOR ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public DashboardGestorDTO getDashboardGestor() {
        log.info("[GESTOR] Iniciando getDashboardGestor");

        log.info("[GESTOR] Paso 1: getSolicitudesPorEstado");
        Map<String, Long> estadoMap = dashboardRepository.getSolicitudesPorEstado().stream()
            .collect(Collectors.toMap(
                r -> (String) r[0],
                r -> ((Number) r[1]).longValue()
            ));

        long pendientes  = estadoMap.getOrDefault("PENDIENTE",  0L);
        long aceptadas   = estadoMap.getOrDefault("ACEPTADA",   0L);
        long procesadas  = estadoMap.getOrDefault("PROCESADO",  0L);
        long rechazadas  = estadoMap.getOrDefault("RECHAZADA",  0L);
        long enPedido    = estadoMap.getOrDefault("EN_PEDIDO",  0L);
        long total       = pendientes + aceptadas + procesadas + rechazadas + enPedido;

        log.info("[GESTOR] Paso 2: getTiempoPromedioHoras");
        double tiempoPromedioHoras = dashboardRepository.getTiempoPromedioHoras();

        log.info("[GESTOR] Paso 3: getSolicitudesPorAsignatura");
        List<ChartPointDTO> solicitudesPorAsignatura = dashboardRepository.getSolicitudesPorAsignatura().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());

        List<PieSliceDTO> solicitudesPorEstado = buildEstadoPie(estadoMap);

        log.info("[GESTOR] Paso 4: getSolicitudesRechazadas");
        List<SolicitudRechazadaDTO> rechazadasRecientes = dashboardRepository.getSolicitudesRechazadas().stream()
            .map(r -> new SolicitudRechazadaDTO(
                ((Number) r[0]).intValue(),
                (String) r[1],
                (String) r[2],
                (String) r[3],
                (String) r[4],
                (String) r[5],
                (String) r[6]
            ))
            .collect(Collectors.toList());

        log.info("[GESTOR] OK - total={}", total);
        return new DashboardGestorDTO(
            total,
            pendientes,
            aceptadas,
            procesadas,
            rechazadas,
            enPedido,
            tiempoPromedioHoras,
            solicitudesPorAsignatura,
            solicitudesPorEstado,
            rechazadasRecientes
        );
    }

    // ── RECETAS ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public DashboardRecetasDTO getDashboardRecetas() {
        log.info("[RECETAS] Iniciando getDashboardRecetas");

        log.info("[RECETAS] Paso 1: getRecetasKpis");
        Object[] kpis = dashboardRepository.getRecetasKpis();
        long recetasActivas   = ((Number) kpis[0]).longValue();
        long recetasInactivas = ((Number) kpis[1]).longValue();
        long recetasTotal     = ((Number) kpis[2]).longValue();
        log.info("[RECETAS] KPIs: activas={}, inactivas={}, total={}", recetasActivas, recetasInactivas, recetasTotal);

        log.info("[RECETAS] Paso 2: getTopIngredientes");
        List<ChartPointDTO> topIngredientes = dashboardRepository.getTopIngredientes().stream()
            .map(r -> new ChartPointDTO((String) r[0], ((Number) r[1]).doubleValue()))
            .collect(Collectors.toList());

        List<PieSliceDTO> recetasPorEstado = List.of(
            new PieSliceDTO("Activas",   recetasActivas,   "#22C55E"),
            new PieSliceDTO("Inactivas", recetasInactivas, "#9CA3AF")
        );

        log.info("[RECETAS] OK");
        return new DashboardRecetasDTO(
            recetasActivas,
            recetasInactivas,
            recetasTotal,
            topIngredientes,
            recetasPorEstado
        );
    }
}
