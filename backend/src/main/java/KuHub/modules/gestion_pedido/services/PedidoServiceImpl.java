package KuHub.modules.gestion_pedido.services;

import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.repository.BodegaTransitoRepository;
import KuHub.modules.gestion_inventario.services.MovimientoService;
import KuHub.modules.gestion_pedido.dtos.response.ResumenHistoricoResponse;
import KuHub.modules.gestion_pedido.entity.DetallePedido;
import KuHub.modules.gestion_pedido.entity.Pedido;
import KuHub.modules.gestion_pedido.entity.PedidoSolicitud;
import KuHub.modules.gestion_pedido.record.ChangePedidoStatusDTO;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.record.PedidoDashboardRecords;
import KuHub.modules.gestion_pedido.record.PrepararEntregaDTO;
import KuHub.modules.gestion_pedido.repository.DetallePedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoSolicitudRepository;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;
import KuHub.modules.gestion_solicitud.entity.Solicitud;
import KuHub.modules.gestion_solicitud.repository.SolicitudRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PedidoServiceImpl implements PedidoService{

    @Autowired
    private PedidoRepository pedidoRepository;
    @Autowired
    private DetallePedidoRepository detallePedidoRepository;
    @Autowired
    private PedidoSolicitudRepository pedidoSolicitudRepository;
    @Autowired
    private SolicitudRepository solicitudRepository;
    @Autowired
    private BodegaTransitoRepository bodegaTransitoRepository;
    @Autowired
    private MovimientoService movimientoService;
    @Autowired
    private ObjectMapper objectMapper;


    /**
     * Único método público que ejecuta las 3 consultas
     * y ensambla el PedidoDashboardResponse completo.
     *
     * Las consultas están separadas en el repository para
     * mejor mantención — cada una se puede ajustar sin
     * afectar a las otras.
     */
    @Override
    @Transactional(readOnly = true)
    public PedidoDashboardRecords.PedidoDashboardResponse obtenerDashboardPedidos(DateRangeDTO request) {

        // Consulta 1: Pedidos completos con detalles y solicitudes vinculadas
        List<PedidoDashboardRecords.PedidoCompletoJson> pedidosCompletos = deserializarLista(
                pedidoRepository.findPedidoConDetallesJson(
                        request.getFechaInicio(),
                        request.getFechaFin()
                ),
                new TypeReference<List<PedidoDashboardRecords.PedidoCompletoJson>>() {},
                "findPedidoConDetallesJson"
        );

        // Consulta 2: Pedidos con productos consolidados
        List<PedidoDashboardRecords.PedidoResumenListaJson> pedidosResumen = deserializarLista(
                pedidoRepository.findPedidosPorRangoJson(
                        request.getFechaInicio(),
                        request.getFechaFin()
                ),
                new TypeReference<List<PedidoDashboardRecords.PedidoResumenListaJson>>() {},
                "findPedidosPorRangoJson"
        );

        // Consulta 3: Pedidos con resumen de aprobación y stock
        List<PedidoDashboardRecords.PedidoAprobacionJson> pedidosAprobacion = deserializarLista(
                pedidoRepository.findPedidoResumenAprobacionJson(
                        request.getFechaInicio(),
                        request.getFechaFin()
                ),
                new TypeReference<List<PedidoDashboardRecords.PedidoAprobacionJson>>() {},
                "findPedidoResumenAprobacionJson"
        );

        return new PedidoDashboardRecords.PedidoDashboardResponse(
                pedidosCompletos,
                pedidosResumen,
                pedidosAprobacion
        );
    }



    @Override
    @Transactional
    public boolean consolidateOrder(CreateOrder request){
        try {
            // 1. Extraer IDs de solicitudes para la actualización masiva posterior
            List<Integer> idsSolicitudes = request.solicitudes().stream()
                    .map(CreateOrder.SolicitudItemRequest::idSolicitud)
                    .toList();

            // 2. Crear y setear el objeto Pedido (Cabecera)
            Pedido pedido = new Pedido();
            pedido.setFechaInicioPedido(request.fechaInicio());
            pedido.setFechaFinPedido(request.fechaFin());
            pedido.setEstadoPedido(Pedido.EstadoPedidoType.PENDIENTE); // Default

            // Guardar cabecera
            Pedido savedPedido = pedidoRepository.save(pedido);

            // 3. Preparar lista de Detalles (detalle_pedido)
            List<DetallePedido> detallesParaGuardar = new ArrayList<>();
            for (CreateOrder.DetalleItemRequest item : request.detalles()) {
                DetallePedido detalle = new DetallePedido();
                detalle.setIdPedido(savedPedido.getIdPedido()); // Helper ID
                detalle.setIdProducto(item.idProducto());       // Helper ID
                detalle.setCantProductoPedido(item.cantidadTotal());
                detallesParaGuardar.add(detalle);
            }
            detallePedidoRepository.saveAll(detallesParaGuardar);

            // 4. Preparar lista de Vínculos (pedido_solicitud)
            List<PedidoSolicitud> vinculacionesParaGuardar = new ArrayList<>();
            for (CreateOrder.SolicitudItemRequest solItem : request.solicitudes()) {
                PedidoSolicitud ps = new PedidoSolicitud();
                ps.setIdPedido(savedPedido.getIdPedido()); // Helper ID
                // Usando tu helper para la FK compuesta (ID + Fecha)
                ps.setIdSolicitudCompuesta(solItem.idSolicitud(), solItem.fechaSolicitada());
                vinculacionesParaGuardar.add(ps);
            }
            pedidoSolicitudRepository.saveAll(vinculacionesParaGuardar);

            // 5. Actualizar el estado de las solicitudes ACEPTADAS vinculadas al pedido a EN_PEDIDO
            solicitudRepository.updateMassiveStateSolicitation(idsSolicitudes, Solicitud.EstadoSolicitud.EN_PEDIDO);
            log.info("Pedido {} creado. {} solicitudes actualizadas a EN_PEDIDO.",
                    savedPedido.getIdPedido(), idsSolicitudes.size());

            return true;

        } catch (Exception e) {
            // Log del error (puedes usar un logger aquí)
            return false;
        }
    }

    @Override
    @Transactional
    public boolean changeMassiveStatus(ChangePedidoStatusDTO request) {
        int filasAfectadas = pedidoRepository.updateMassiveStatePedido(request.idsPedidos(), request.estado());
        return filasAfectadas > 0;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PedidoDashboardRecords.EntregaDiariaBodegaJson> obtenerEntregasDiarias(DateRangeDTO request) {
        return deserializarLista(
                pedidoRepository.findEntregasDiariasJson(
                        request.getFechaInicio(),
                        request.getFechaFin()
                ),
                new TypeReference<List<PedidoDashboardRecords.EntregaDiariaBodegaJson>>() {},
                "findEntregasDiariasJson"
        );
    }

    /** Transiciona a ENTREGADO los pedidos APROBADOS cuya semana ya finalizó. Se ejecuta diariamente a las 03:00 AM. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void marcarPedidosEntregadosScheduled() {
        int actualizados = pedidoRepository.marcarPedidosEntregadosPorFecha();
        if (actualizados > 0) {
            log.info("[Scheduler] Auto-entregado nocturno: {} pedido(s) transitados a ENTREGADO por fecha_fin_pedido vencida.", actualizados);
        }
    }

    // =====================================================
    // PREPARAR ENTREGA: descuento bodega de tránsito + PROCESADO
    // =====================================================

    @Override
    @Transactional(noRollbackFor = StockDesincronizadoException.class)
    public String prepararEntrega(PrepararEntregaDTO request) {
        List<String> desincronizados = new ArrayList<>();

        for (PrepararEntregaDTO.ProductoPreparadoDTO item : request.productos()) {
            BodegaTransito bt = bodegaTransitoRepository
                    .findActiveByProductoId(item.idProducto())
                    .orElseThrow(() -> new GestionInventarioException(
                            "Sin bodega de tránsito activa para el producto ID " + item.idProducto(),
                            HttpStatus.NOT_FOUND));

            BigDecimal stockReal = bt.getStock();

            // ❌ Stock insuficiente → rollback automático
            if (stockReal.compareTo(item.cantidadAEntregar()) < 0) {
                throw new StockInsuficienteException(
                        "Stock insuficiente en bodega de tránsito para '" +
                        bt.getInventario().getProducto().getNombreProducto() +
                        "'. Disponible: " + stockReal + " | A entregar: " + item.cantidadAEntregar(),
                        null
                );
            }

            // ⚠️ Desincronización detectada → registrar pero continuar
            if (stockReal.compareTo(item.stockEnVista()) != 0) {
                desincronizados.add(bt.getInventario().getProducto().getNombreProducto());
                log.warn("Desincronización al preparar entrega. Producto: '{}' | Vista: {} | Real: {}",
                        bt.getInventario().getProducto().getNombreProducto(),
                        item.stockEnVista(), stockReal);
            }

            // ✅ Registrar SALIDA_BODEGA y descontar stock
            movimientoService.motionInUpdateTransitWarehouse(bt, item.cantidadAEntregar(), "SALIDA_BODEGA");
        }

        // Cambiar estado de la solicitud a PROCESADO (único cambio de estado al preparar)
        solicitudRepository.updateMassiveStateSolicitation(List.of(request.idSolicitud()), Solicitud.EstadoSolicitud.PROCESADO);
        log.info("Solicitud {} marcada como PROCESADO tras preparar entrega.", request.idSolicitud());

        // ⚠️ Si hubo desincronización → 409 (transacción YA committed)
        if (!desincronizados.isEmpty()) {
            throw new StockDesincronizadoException(
                    "Entrega preparada con éxito usando el stock real. El stock de los siguientes productos " +
                    "cambió mientras abrías el modal: " + String.join(", ", desincronizados),
                    null,
                    HttpStatus.CONFLICT
            );
        }

        return "Entrega preparada y solicitud procesada correctamente.";
    }

    @Override
    @Transactional(readOnly = true)
    public ResumenHistoricoResponse obtenerResumenHistorico(LocalDate fechaInicio, LocalDate fechaFin, String estadosCsv) {
        log.info("🔵 [SERVICE] obtenerResumenHistorico INICIADO");
        log.info("📅 [SERVICE] Parámetro fechaInicio: {} (tipo: {})", fechaInicio, fechaInicio != null ? fechaInicio.getClass().getSimpleName() : "null");
        log.info("📅 [SERVICE] Parámetro fechaFin: {} (tipo: {})", fechaFin, fechaFin != null ? fechaFin.getClass().getSimpleName() : "null");
        log.info("🏷️  [SERVICE] Parámetro estadosCsv: '{}' (longitud: {})", estadosCsv, estadosCsv != null ? estadosCsv.length() : "null");

        String jsonResult = pedidoRepository.obtenerResumenHistoricoJSON(fechaInicio, fechaFin, estadosCsv);
        log.info("📦 [SERVICE] JSON retornado del repository: {} caracteres", jsonResult != null ? jsonResult.length() : "null");

        if (jsonResult == null || jsonResult.isBlank()) {
            log.warn("⚠️  [SERVICE] obtenerResumenHistoricoJSON retornó VACÍO para rango {}-{} con estados '{}'",
                    fechaInicio, fechaFin, estadosCsv);
            return new ResumenHistoricoResponse(fechaInicio, fechaFin, List.of(), 0, 0, List.of());
        }

        try {
            log.info("✅ [SERVICE] Parseando JSON response...");
            log.info("🔍 [SERVICE] JSON COMPLETO recibido: {}", jsonResult);
            var rootNode = objectMapper.readTree(jsonResult);

            log.info("🔍 [SERVICE] rootNode type: {}", rootNode != null ? rootNode.getNodeType() : "null");

            if (rootNode == null || rootNode.isNull()) {
                log.warn("⚠️  [SERVICE] ❌ rootNode es NULL para rango {}-{} con estados '{}'",
                        fechaInicio, fechaFin, estadosCsv);
                return new ResumenHistoricoResponse(fechaInicio, fechaFin, List.of(), 0, 0, List.of());
            }

            log.info("✅ [SERVICE] rootNode encontrado, extrayendo datos...");

            var estadosList = objectMapper.convertValue(
                    rootNode.get("estados"),
                    new TypeReference<List<String>>() {}
            );
            int totalProductos = rootNode.get("totalProductosDistintos").asInt();
            int totalPedidos = rootNode.get("totalPedidos").asInt();

            var productos = objectMapper.convertValue(
                    rootNode.get("productos"),
                    new TypeReference<List<ResumenHistoricoResponse.ProductoResumenItem>>() {}
            );

            log.info("✅ [SERVICE] RESULTADOS FINALES:");
            log.info("  📊 Total Productos Distintos: {}", totalProductos);
            log.info("  📊 Total Pedidos: {}", totalPedidos);
            log.info("  📊 Estados encontrados: {}", estadosList);
            log.info("  📊 Productos en lista: {} items", productos.size());

            String fechaInicioStr = rootNode.get("fechaInicio").asText();
            String fechaFinStr = rootNode.get("fechaFin").asText();

            LocalDate fechaInicioResponse = fechaInicio;
            LocalDate fechaFinResponse = fechaFin;

            if (!fechaInicioStr.isEmpty()) {
                String fechaInicioClean = fechaInicioStr.substring(0, Math.min(10, fechaInicioStr.length()));
                try {
                    fechaInicioResponse = LocalDate.parse(fechaInicioClean);
                } catch (Exception e) {
                    log.warn("No se pudo parsear fechaInicio: {}", fechaInicioStr);
                }
            }

            if (!fechaFinStr.isEmpty()) {
                String fechaFinClean = fechaFinStr.substring(0, Math.min(10, fechaFinStr.length()));
                try {
                    fechaFinResponse = LocalDate.parse(fechaFinClean);
                } catch (Exception e) {
                    log.warn("No se pudo parsear fechaFin: {}", fechaFinStr);
                }
            }

            return new ResumenHistoricoResponse(
                    fechaInicioResponse,
                    fechaFinResponse,
                    estadosList,
                    totalProductos,
                    totalPedidos,
                    productos
            );
        } catch (JsonProcessingException e) {
            log.error("Error deserializando obtenerResumenHistoricoJSON: {}", e.getMessage(), e);
            throw new RuntimeException("Error al procesar resumen histórico", e);
        }
    }

    // =====================================================
    // NOTIFICACIONES: pedidos PENDIENTE agrupados por semana
    // =====================================================

    @Transactional(readOnly = true)
    @Override
    public List<NotificacionSemanaDTO> obtenerNotificacionesPedidosPendientes() {
        return pedidoRepository.findPedidosPendientesPorSemana().stream()
                .map(row -> new NotificacionSemanaDTO(
                        ((Number) row[0]).intValue(),
                        (String) row[1],
                        ((java.sql.Date) row[2]).toLocalDate(),
                        ((java.sql.Date) row[3]).toLocalDate(),
                        ((Number) row[4]).intValue(),
                        ((Number) row[5]).intValue(),
                        ((Number) row[6]).longValue()
                ))
                .toList();
    }

    // =====================================================
    // MÉTODO GENÉRICO DE DESERIALIZACIÓN
    // Un solo método para las 3 consultas (todas son List<>)
    // =====================================================

    private <T> List<T> deserializarLista(String json, TypeReference<List<T>> typeRef, String queryName) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) {
            log.info("{} retornó vacío", queryName);
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (JsonProcessingException e) {
            log.error("Error deserializando {}: {}", queryName, e.getMessage(), e);
            throw new RuntimeException("Error al procesar " + queryName, e);
        }
    }

}
