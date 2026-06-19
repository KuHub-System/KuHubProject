package KuHub.modules.gestion_pedido.services;

import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import KuHub.modules.gestion_inventario.entity.Inventario;
import KuHub.modules.gestion_inventario.entity.Producto;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.repository.BodegaTransitoRepository;
import KuHub.modules.gestion_inventario.services.MovimientoService;
import KuHub.modules.gestion_pedido.dtos.response.ResumenHistoricoResponse;
import KuHub.modules.gestion_pedido.entity.DetallePedido;
import KuHub.modules.gestion_pedido.entity.Pedido;
import KuHub.modules.gestion_pedido.record.ChangePedidoStatusDTO;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.record.PedidoDashboardRecords;
import KuHub.modules.gestion_pedido.record.PrepararEntregaDTO;
import KuHub.modules.gestion_pedido.repository.DetallePedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoRepository;
import KuHub.modules.gestion_pedido.repository.PedidoSolicitudRepository;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import KuHub.modules.gestion_solicitud.entity.Solicitud;
import KuHub.modules.gestion_solicitud.repository.SolicitudRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PedidoServiceImplTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private DetallePedidoRepository detallePedidoRepository;
    @Mock private PedidoSolicitudRepository pedidoSolicitudRepository;
    @Mock private SolicitudRepository solicitudRepository;
    @Mock private BodegaTransitoRepository bodegaTransitoRepository;
    @Mock private MovimientoService movimientoService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private PedidoServiceImpl service;

    // =====================================================
    // obtenerDashboardPedidos
    // =====================================================

    @Test
    @SuppressWarnings("unchecked")
    void test01ObtenerDashboardPedidosJsonVacio() {
        LocalDate inicio = LocalDate.of(2026, 1, 1);
        LocalDate fin   = LocalDate.of(2026, 12, 31);
        DateRangeDTO dto = new DateRangeDTO(inicio, fin);

        when(pedidoRepository.findPedidoConDetallesJson(inicio, fin)).thenReturn("[]");
        when(pedidoRepository.findPedidosPorRangoJson(inicio, fin)).thenReturn("[]");
        when(pedidoRepository.findPedidoResumenAprobacionJson(inicio, fin)).thenReturn("[]");

        var result = service.obtenerDashboardPedidos(dto);

        assertNotNull(result);
        assertTrue(result.pedidosCompletos().isEmpty());
        assertTrue(result.pedidosResumen().isEmpty());
        assertTrue(result.pedidosAprobacion().isEmpty());
    }

    @Test
    @SuppressWarnings("unchecked")
    void test02ObtenerDashboardPedidosConDatos() throws Exception {
        LocalDate inicio = LocalDate.of(2026, 1, 1);
        LocalDate fin   = LocalDate.of(2026, 12, 31);
        DateRangeDTO dto = new DateRangeDTO(inicio, fin);

        String jsonCompletos  = "[{\"idPedido\":1}]";
        String jsonResumen    = "[{\"idPedido\":2}]";
        String jsonAprobacion = "[{\"idPedido\":3}]";

        when(pedidoRepository.findPedidoConDetallesJson(inicio, fin)).thenReturn(jsonCompletos);
        when(pedidoRepository.findPedidosPorRangoJson(inicio, fin)).thenReturn(jsonResumen);
        when(pedidoRepository.findPedidoResumenAprobacionJson(inicio, fin)).thenReturn(jsonAprobacion);

        PedidoDashboardRecords.PedidoCompletoJson pedidoCompleto =
                new PedidoDashboardRecords.PedidoCompletoJson(
                        1, inicio, fin, null, "PENDIENTE", 1, 1, List.of(), List.of());
        PedidoDashboardRecords.PedidoResumenListaJson pedidoResumen =
                new PedidoDashboardRecords.PedidoResumenListaJson(
                        2, inicio, fin, null, "APROBADO", 1, 2, List.of());
        PedidoDashboardRecords.PedidoAprobacionJson pedidoAprobacion =
                new PedidoDashboardRecords.PedidoAprobacionJson(
                        3, "APROBADO", inicio, fin, false, List.of());

        when(objectMapper.readValue(eq(jsonCompletos), any(TypeReference.class)))
                .thenReturn(List.of(pedidoCompleto));
        when(objectMapper.readValue(eq(jsonResumen), any(TypeReference.class)))
                .thenReturn(List.of(pedidoResumen));
        when(objectMapper.readValue(eq(jsonAprobacion), any(TypeReference.class)))
                .thenReturn(List.of(pedidoAprobacion));

        var result = service.obtenerDashboardPedidos(dto);

        assertNotNull(result);
        assertEquals(1, result.pedidosCompletos().size());
        assertEquals(1, result.pedidosResumen().size());
        assertEquals(1, result.pedidosAprobacion().size());
        assertEquals(1, result.pedidosCompletos().get(0).idPedido());
    }

    // =====================================================
    // consolidateOrder
    // =====================================================

    @Test
    void test03ConsolidateOrderExito() {
        LocalDate inicio = LocalDate.of(2026, 4, 7);
        LocalDate fin   = LocalDate.of(2026, 4, 13);

        CreateOrder.SolicitudItemRequest solItem =
                new CreateOrder.SolicitudItemRequest(10, inicio);
        CreateOrder.DetalleItemRequest detItem =
                new CreateOrder.DetalleItemRequest(1, BigDecimal.valueOf(5));

        CreateOrder request = new CreateOrder(inicio, fin, List.of(solItem), List.of(detItem));

        Pedido pedidoGuardado = new Pedido();
        pedidoGuardado.setIdPedido(99);

        when(pedidoRepository.save(any(Pedido.class))).thenReturn(pedidoGuardado);
        when(detallePedidoRepository.saveAll(anyList())).thenReturn(List.of(new DetallePedido()));
        when(pedidoSolicitudRepository.saveAll(anyList())).thenReturn(List.of());
        when(solicitudRepository.updateMassiveStateSolicitation(
                eq(List.of(10)), eq(Solicitud.EstadoSolicitud.EN_PEDIDO))).thenReturn(1);

        boolean result = service.consolidateOrder(request);

        assertTrue(result);
        verify(pedidoRepository).save(any(Pedido.class));
        verify(detallePedidoRepository).saveAll(anyList());
        verify(pedidoSolicitudRepository).saveAll(anyList());
        verify(solicitudRepository).updateMassiveStateSolicitation(
                eq(List.of(10)), eq(Solicitud.EstadoSolicitud.EN_PEDIDO));
    }

    @Test
    void test04ConsolidateOrderFallo() {
        LocalDate inicio = LocalDate.of(2026, 4, 7);
        LocalDate fin   = LocalDate.of(2026, 4, 13);

        CreateOrder.SolicitudItemRequest solItem =
                new CreateOrder.SolicitudItemRequest(10, inicio);
        CreateOrder.DetalleItemRequest detItem =
                new CreateOrder.DetalleItemRequest(1, BigDecimal.valueOf(5));

        CreateOrder request = new CreateOrder(inicio, fin, List.of(solItem), List.of(detItem));

        when(pedidoRepository.save(any(Pedido.class))).thenThrow(new RuntimeException("DB error"));

        boolean result = service.consolidateOrder(request);

        assertFalse(result);
    }

    // =====================================================
    // changeMassiveStatus
    // =====================================================

    @Test
    void test05ChangeMassiveStatusTrue() {
        ChangePedidoStatusDTO dto = new ChangePedidoStatusDTO(List.of(1, 2), "APROBADO");
        when(pedidoRepository.updateMassiveStatePedido(List.of(1, 2), "APROBADO")).thenReturn(2);

        boolean result = service.changeMassiveStatus(dto);

        assertTrue(result);
    }

    @Test
    void test06ChangeMassiveStatusFalse() {
        ChangePedidoStatusDTO dto = new ChangePedidoStatusDTO(List.of(999), "APROBADO");
        when(pedidoRepository.updateMassiveStatePedido(List.of(999), "APROBADO")).thenReturn(0);

        boolean result = service.changeMassiveStatus(dto);

        assertFalse(result);
    }

    // =====================================================
    // obtenerEntregasDiarias
    // =====================================================

    @Test
    @SuppressWarnings("unchecked")
    void test07ObtenerEntregasDiariasJsonVacio() {
        LocalDate inicio = LocalDate.of(2026, 5, 1);
        LocalDate fin   = LocalDate.of(2026, 5, 7);
        DateRangeDTO dto = new DateRangeDTO(inicio, fin);

        when(pedidoRepository.findEntregasDiariasJson(inicio, fin)).thenReturn("[]");

        List<PedidoDashboardRecords.EntregaDiariaBodegaJson> result =
                service.obtenerEntregasDiarias(dto);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    @SuppressWarnings("unchecked")
    void test08ObtenerEntregasDiariasConDatos() throws Exception {
        LocalDate inicio = LocalDate.of(2026, 5, 1);
        LocalDate fin   = LocalDate.of(2026, 5, 7);
        DateRangeDTO dto = new DateRangeDTO(inicio, fin);

        String json = "[{\"fecha\":\"2026-05-01\"}]";
        PedidoDashboardRecords.EntregaDiariaBodegaJson entrega =
                new PedidoDashboardRecords.EntregaDiariaBodegaJson(inicio, 1, List.of());

        when(pedidoRepository.findEntregasDiariasJson(inicio, fin)).thenReturn(json);
        when(objectMapper.readValue(eq(json), any(TypeReference.class)))
                .thenReturn(List.of(entrega));

        List<PedidoDashboardRecords.EntregaDiariaBodegaJson> result =
                service.obtenerEntregasDiarias(dto);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(inicio, result.get(0).fecha());
    }

    // =====================================================
    // prepararEntrega
    // =====================================================

    @Test
    void test09PrepararEntregaExito() {
        Producto producto = new Producto();
        producto.setNombreProducto("Leche");

        Inventario inventario = new Inventario();
        inventario.setProducto(producto);

        BodegaTransito bt = new BodegaTransito();
        bt.setInventario(inventario);
        bt.setStock(BigDecimal.valueOf(100));

        // stockEnVista = 100 == stockReal = 100 → sin desincronización
        // cantidadAEntregar = 10
        PrepararEntregaDTO.ProductoPreparadoDTO item =
                new PrepararEntregaDTO.ProductoPreparadoDTO(1, BigDecimal.valueOf(100), BigDecimal.valueOf(10));
        PrepararEntregaDTO request = new PrepararEntregaDTO(5, List.of(item));

        when(bodegaTransitoRepository.findActiveByProductoId(1)).thenReturn(Optional.of(bt));
        when(movimientoService.motionInUpdateTransitWarehouse(
                eq(bt), eq(BigDecimal.valueOf(10)), eq("SALIDA_BODEGA"))).thenReturn(true);
        when(solicitudRepository.updateMassiveStateSolicitation(
                eq(List.of(5)), eq(Solicitud.EstadoSolicitud.PROCESADO))).thenReturn(1);

        String result = service.prepararEntrega(request);

        assertNotNull(result);
        assertTrue(result.contains("correctamente"));
        verify(movimientoService).motionInUpdateTransitWarehouse(
                eq(bt), eq(BigDecimal.valueOf(10)), eq("SALIDA_BODEGA"));
    }

    @Test
    void test10PrepararEntregaStockInsuficiente() {
        Producto producto = new Producto();
        producto.setNombreProducto("Harina");

        Inventario inventario = new Inventario();
        inventario.setProducto(producto);

        BodegaTransito bt = new BodegaTransito();
        bt.setInventario(inventario);
        bt.setStock(BigDecimal.valueOf(5));

        // stock = 5, cantidadAEntregar = 20 → insuficiente
        PrepararEntregaDTO.ProductoPreparadoDTO item =
                new PrepararEntregaDTO.ProductoPreparadoDTO(2, BigDecimal.valueOf(5), BigDecimal.valueOf(20));
        PrepararEntregaDTO request = new PrepararEntregaDTO(6, List.of(item));

        when(bodegaTransitoRepository.findActiveByProductoId(2)).thenReturn(Optional.of(bt));

        assertThrows(StockInsuficienteException.class, () -> service.prepararEntrega(request));
    }

    @Test
    void test11PrepararEntregaBodegaNoEncontrada() {
        PrepararEntregaDTO.ProductoPreparadoDTO item =
                new PrepararEntregaDTO.ProductoPreparadoDTO(999, BigDecimal.valueOf(10), BigDecimal.valueOf(5));
        PrepararEntregaDTO request = new PrepararEntregaDTO(7, List.of(item));

        when(bodegaTransitoRepository.findActiveByProductoId(999)).thenReturn(Optional.empty());

        assertThrows(GestionInventarioException.class, () -> service.prepararEntrega(request));
    }

    @Test
    void test12PrepararEntregaDesincronizado() {
        Producto producto = new Producto();
        producto.setNombreProducto("Azucar");

        Inventario inventario = new Inventario();
        inventario.setProducto(producto);

        BodegaTransito bt = new BodegaTransito();
        bt.setInventario(inventario);
        bt.setStock(BigDecimal.valueOf(80));

        // stockEnVista = 100 != stockReal = 80 → desincronización
        // cantidadAEntregar = 10, stock = 80 → suficiente
        PrepararEntregaDTO.ProductoPreparadoDTO item =
                new PrepararEntregaDTO.ProductoPreparadoDTO(3, BigDecimal.valueOf(100), BigDecimal.valueOf(10));
        PrepararEntregaDTO request = new PrepararEntregaDTO(8, List.of(item));

        when(bodegaTransitoRepository.findActiveByProductoId(3)).thenReturn(Optional.of(bt));
        when(movimientoService.motionInUpdateTransitWarehouse(
                eq(bt), eq(BigDecimal.valueOf(10)), eq("SALIDA_BODEGA"))).thenReturn(true);
        when(solicitudRepository.updateMassiveStateSolicitation(
                eq(List.of(8)), eq(Solicitud.EstadoSolicitud.PROCESADO))).thenReturn(1);

        assertThrows(StockDesincronizadoException.class, () -> service.prepararEntrega(request));
        verify(solicitudRepository).updateMassiveStateSolicitation(
                eq(List.of(8)), eq(Solicitud.EstadoSolicitud.PROCESADO));
    }

    // =====================================================
    // obtenerResumenHistorico
    // =====================================================

    @Test
    void test13ObtenerResumenHistoricoVacio() {
        LocalDate inicio = LocalDate.of(2026, 1, 1);
        LocalDate fin   = LocalDate.of(2026, 12, 31);

        when(pedidoRepository.obtenerResumenHistoricoJSON(inicio, fin, "APROBADO")).thenReturn(null);

        ResumenHistoricoResponse result = service.obtenerResumenHistorico(inicio, fin, "APROBADO");

        assertNotNull(result);
        assertEquals(0, result.totalProductosDistintos());
        assertEquals(0, result.totalPedidos());
        assertTrue(result.productos().isEmpty());
        assertTrue(result.estados().isEmpty());
    }

    @Test
    @SuppressWarnings("unchecked")
    void test14ObtenerResumenHistoricoConDatos() throws Exception {
        LocalDate inicio = LocalDate.of(2026, 1, 1);
        LocalDate fin   = LocalDate.of(2026, 12, 31);
        String json = "{\"resumen\":\"data\"}";

        when(pedidoRepository.obtenerResumenHistoricoJSON(inicio, fin, "APROBADO")).thenReturn(json);

        JsonNode rootNode           = mock(JsonNode.class);
        JsonNode estadosNode        = mock(JsonNode.class);
        JsonNode productosNode      = mock(JsonNode.class);
        JsonNode totalProductosNode = mock(JsonNode.class);
        JsonNode totalPedidosNode   = mock(JsonNode.class);
        JsonNode fechaInicioNode    = mock(JsonNode.class);
        JsonNode fechaFinNode       = mock(JsonNode.class);

        when(objectMapper.readTree(json)).thenReturn(rootNode);
        when(rootNode.isNull()).thenReturn(false);
        when(rootNode.get("estados")).thenReturn(estadosNode);
        when(rootNode.get("totalProductosDistintos")).thenReturn(totalProductosNode);
        when(totalProductosNode.asInt()).thenReturn(5);
        when(rootNode.get("totalPedidos")).thenReturn(totalPedidosNode);
        when(totalPedidosNode.asInt()).thenReturn(3);
        when(rootNode.get("productos")).thenReturn(productosNode);
        when(rootNode.get("fechaInicio")).thenReturn(fechaInicioNode);
        when(fechaInicioNode.asText()).thenReturn("2026-01-01");
        when(rootNode.get("fechaFin")).thenReturn(fechaFinNode);
        when(fechaFinNode.asText()).thenReturn("2026-12-31");

        when(objectMapper.convertValue(eq(estadosNode), any(TypeReference.class)))
                .thenReturn(List.of("APROBADO"));
        when(objectMapper.convertValue(eq(productosNode), any(TypeReference.class)))
                .thenReturn(List.of());

        ResumenHistoricoResponse result = service.obtenerResumenHistorico(inicio, fin, "APROBADO");

        assertNotNull(result);
        assertEquals(5, result.totalProductosDistintos());
        assertEquals(3, result.totalPedidos());
        assertEquals(1, result.estados().size());
        assertEquals("APROBADO", result.estados().get(0));
        assertEquals(inicio, result.fechaInicio());
        assertEquals(fin, result.fechaFin());
    }

    @Test
    void test15ObtenerResumenHistoricoJsonInvalido() throws Exception {
        LocalDate inicio = LocalDate.of(2026, 1, 1);
        LocalDate fin   = LocalDate.of(2026, 12, 31);
        String json = "{\"malformado\"}";

        when(pedidoRepository.obtenerResumenHistoricoJSON(inicio, fin, "APROBADO")).thenReturn(json);
        when(objectMapper.readTree(json)).thenThrow(mock(JsonProcessingException.class));

        assertThrows(RuntimeException.class,
                () -> service.obtenerResumenHistorico(inicio, fin, "APROBADO"));
    }
}
