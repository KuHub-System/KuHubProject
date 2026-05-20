package KuHub.modules.gestion_orden_compra.service;

import KuHub.modules.gestion_orden_compra.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_compra.dtos.response.PedidoSemanaResumenDTO;
import KuHub.modules.gestion_orden_compra.exceptions.GestionOrdenCompraException;
import KuHub.modules.gestion_orden_compra.repository.OrdenCompraRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.TypeFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrdenCompraServiceImpl implements OrdenCompraService {

    /**Repositories*/
    @Autowired
    private OrdenCompraRepository ordenCompraRepository;

    /**Others*/
    @Autowired
    private ObjectMapper objectMapper;

    // ─────────────────────────────────────────────────────────────
    // PASO 1 — Listado de pedidos APROBADO con contador de OC
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<PedidoSemanaResumenDTO> listarPedidosSemana(LocalDate fechaInicio, LocalDate fechaFin) {
        List<Object[]> rows = ordenCompraRepository.findPedidosSemanaConIndicadorOC(fechaInicio, fechaFin);
        log.info("listarPedidosSemana: {} → {} | {} pedidos APROBADO", fechaInicio, fechaFin, rows.size());
        return rows.stream().map(PedidoSemanaResumenDTO::fromRow).toList();
    }

    // ─────────────────────────────────────────────────────────────
    // PASO 2 — Cotización consolidada jerárquica (menor precio)
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CotizacionConsolidadaDTO.CotizacionConsolidadaResponse obtenerCotizacionConsolidada(List<Integer> idsPedido) {
        if (idsPedido == null || idsPedido.isEmpty()) {
            log.info("obtenerCotizacionConsolidada: lista vacía → retorna [].");
            return new CotizacionConsolidadaDTO.CotizacionConsolidadaResponse(List.of());
        }

        String jsonStr = ordenCompraRepository.findCotizacionConsolidada(idsPedido);

        try {
            if (jsonStr == null || jsonStr.isBlank() || "null".equals(jsonStr)) {
                return new CotizacionConsolidadaDTO.CotizacionConsolidadaResponse(List.of());
            }

            var typeRef = TypeFactory.defaultInstance()
                    .constructCollectionType(List.class, CotizacionConsolidadaDTO.ProveedorGrupo.class);
            List<CotizacionConsolidadaDTO.ProveedorGrupo> cotizacion = objectMapper.readValue(jsonStr, typeRef);

            log.info("obtenerCotizacionConsolidada: pedidos={} | {} proveedores", idsPedido, cotizacion.size());
            return new CotizacionConsolidadaDTO.CotizacionConsolidadaResponse(cotizacion);
        } catch (Exception e) {
            log.error("Error al deserializar cotización consolidada. JSON={} | Error={}", jsonStr, e.getMessage());
            throw new GestionOrdenCompraException(
                    "Error al procesar la cotización consolidada.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
