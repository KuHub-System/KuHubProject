package KuHub.modules.gestion_orden_pedido.service;

import KuHub.modules.gestion_orden_pedido.dtos.request.OrdenPedidoCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoDetalleDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.PedidoSemanaResumenDTO;
import KuHub.modules.gestion_orden_pedido.entity.DetalleOrdenPedido;
import KuHub.modules.gestion_orden_pedido.entity.OrdenPedido;
import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;
import KuHub.modules.gestion_orden_pedido.exceptions.GestionOrdenPedidoException;
import KuHub.modules.gestion_orden_pedido.repository.DetalleOrdenPedidoRepository;
import KuHub.modules.gestion_orden_pedido.repository.OrdenPedidoRepository;
import KuHub.modules.gestion_proveedor.entity.ProveedorProducto;
import KuHub.modules.gestion_proveedor.repository.ProveedorProductoRepository;
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
public class OrdenPedidoServiceImpl implements OrdenPedidoService {

    /**Repositories*/
    @Autowired
    private OrdenPedidoRepository ordenPedidoRepository;

    @Autowired
    private DetalleOrdenPedidoRepository detalleOrdenPedidoRepository;

    @Autowired
    private ProveedorProductoRepository proveedorProductoRepository;

    /**Others*/
    @Autowired
    private ObjectMapper objectMapper;

    // ─────────────────────────────────────────────────────────────
    // PASO 1 — Listado de pedidos APROBADO con contador de OP
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<PedidoSemanaResumenDTO> listarPedidosSemana(LocalDate fechaInicio, LocalDate fechaFin) {
        List<Object[]> rows = ordenPedidoRepository.findPedidosSemanaConIndicadorOP(fechaInicio, fechaFin);
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

        String jsonStr = ordenPedidoRepository.findCotizacionConsolidada(idsPedido);

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
            throw new GestionOrdenPedidoException(
                    "Error al procesar la cotización consolidada.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CREAR ORDEN DE PEDIDO (Tarea #27)
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public OrdenPedidoDetalleDTO crearOrdenPedido(OrdenPedidoCreateDTO request) {
        // 1. Crear la orden principal en estado PENDIENTE
        OrdenPedido orden = new OrdenPedido();
        orden.setIdPedido(request.getIdPedido());
        orden.setIdProveedor(request.getIdProveedor());
        orden.setObservaciones(request.getObservaciones());
        orden.setEstadoOrdenPedido(EstadoOrdenPedido.PENDIENTE);
        orden = ordenPedidoRepository.save(orden);

        // 2. Una fila en detalle_orden_pedido por cada (idProducto, fechaEntrega) con cantidad > 0
        int cantidadDetalles = 0;

        for (OrdenPedidoCreateDTO.EntregaDTO e : request.getEntregas()) {
            ProveedorProducto pp = proveedorProductoRepository
                    .findFirstByProveedor_IdProveedorAndProducto_IdProductoAndActivoTrueOrderByFechaActualizacionDesc(
                            request.getIdProveedor(), e.getIdProducto())
                    .orElse(null);

            DetalleOrdenPedido detalle = new DetalleOrdenPedido();
            detalle.setIdOrdenPedido(orden.getIdOrdenPedido());
            detalle.setIdProducto(e.getIdProducto());
            detalle.setCantidadSolicitada(e.getCantidad());
            detalle.setFechaEntrega(e.getFechaEntrega());
            detalle.setPrecioNetoUnitario(pp != null ? pp.getPrecioNeto() : null);
            detalle.setPrecioConIvaUnitario(pp != null ? pp.getPrecioConIva() : null);
            detalleOrdenPedidoRepository.save(detalle);
            cantidadDetalles++;
        }

        log.info("crearOrdenPedido: OP #{} | pedido={} | proveedor={} | {} detalles",
                orden.getIdOrdenPedido(), request.getIdPedido(), request.getIdProveedor(), cantidadDetalles);

        return new OrdenPedidoDetalleDTO(
                orden.getIdOrdenPedido(),
                request.getIdPedido(),
                request.getIdProveedor(),
                orden.getFechaCreacion(),
                orden.getEstadoOrdenPedido(),
                cantidadDetalles
        );
    }
}
