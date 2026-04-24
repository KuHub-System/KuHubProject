package KuHub.modules.gestion_pedido.controller;

import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_pedido.dtos.request.ResumenHistoricoRequestDTO;
import KuHub.modules.gestion_pedido.dtos.response.ResumenHistoricoResponse;
import KuHub.modules.gestion_pedido.record.ChangePedidoStatusDTO;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.record.PedidoDashboardRecords;
import KuHub.modules.gestion_pedido.record.PrepararEntregaDTO;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import KuHub.modules.gestion_pedido.services.PedidoService;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import KuHub.utils.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;


/**
 * Controller REST para gestión de Pedidos
 * Endpoints: /api/v1/pedido
 * ✅ En uso: Este controlador gestiona la consolidación de pedidos, entregas diarias
 * para bodega de tránsito y cambios de estado masivos.
 * Consumido por solicitud-service.ts en el frontend.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/pedido")
public class PedidoController {

    @Autowired
    private PedidoService pedidoService;

    /**
     * Realiza una consulta consolidada de pedidos (GOD view) para un rango de fechas.
     * ✅ En uso: Consumido por consolidatePedidoQueryService en solicitud-service.ts.
     */
    @PostMapping("/consolidate")
    public ResponseEntity<PedidoDashboardRecords.PedidoDashboardResponse> consultaGOD(
            @Validated @RequestBody DateRangeDTO request){
        return ResponseEntity
                .status(200)
                .body(pedidoService.obtenerDashboardPedidos(request));
    }

    /**
     * Consolida múltiples solicitudes en un nuevo pedido.
     * ✅ En uso: Consumido por consolidarPedidoService en solicitud-service.ts.
     */
    @PostMapping("/consolidate-order")
    public ResponseEntity<Boolean> consolidateOrder(
            @Validated @RequestBody CreateOrder request){
        return ResponseEntity
                .status(201)
                .body(pedidoService.consolidateOrder(request));
    }

    /**
     * Obtiene el listado de entregas diarias para la Bodega de Tránsito, agrupado por sala y horario.
     * ✅ En uso: Consumido por obtenerEntregasDiariasService en solicitud-service.ts.
     */
    @PostMapping("/entregas-diarias")
    public ResponseEntity<List<PedidoDashboardRecords.EntregaDiariaBodegaJson>> obtenerEntregasDiarias(
            @Validated @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(pedidoService.obtenerEntregasDiarias(request));
    }

    /**
     * Procesa la entrega de una solicitud, descontando stock de la Bodega de Tránsito 
     * y actualizando el estado de la solicitud.
     * ✅ En uso: Consumido por prepararEntregaService en solicitud-service.ts.
     */
    @PostMapping("/preparar-entrega")
    public ResponseEntity<?> prepararEntrega(@Validated @RequestBody PrepararEntregaDTO request) {
        try {
            String msg = pedidoService.prepararEntrega(request);
            return ResponseEntity.ok(Map.of("mensaje", msg, "exito", true));
        } catch (StockDesincronizadoException ex) {
            // La entrega SÍ se realizó, pero el stock estaba desincronizado
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensaje", ex.getMessage(), "exito", true, "desincronizado", true));
        } catch (StockInsuficienteException ex) {
            // No se realizó ningún cambio → el frontend muestra el error en el modal
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("mensaje", ex.getMessage(), "exito", false));
        }
    }

    /**
     * Actualiza el estado de múltiples pedidos de forma masiva (Aprobación/Cancelación).
     * ✅ En uso: Consumido por aprobarPedidosService en solicitud-service.ts.
     */
    @PatchMapping("/change-massive-status")
    public ResponseEntity<Boolean> changeMassiveStatus(
            @Validated @RequestBody ChangePedidoStatusDTO request){
        return ResponseEntity
                .status(200)
                .body(pedidoService.changeMassiveStatus(request));
    }

    /**
     * Obtiene resumen histórico de productos consumidos en pedidos.
     * Calcula: total de productos distintos, total de pedidos, y detalle por producto.
     * Filtra por rango de fechas y estados de pedido (CSV: "APROBADO,ENTREGADO").
     * ✅ En uso: Consumido por obtenerResumenHistoricoService en historico-pedido-service.ts.
     */
    @PostMapping("/resumen-historico")
    public ResponseEntity<ResumenHistoricoResponse> obtenerResumenHistorico(
            @Validated @RequestBody ResumenHistoricoRequestDTO request) {
        log.info("=== INICIO obtenerResumenHistorico ===");
        log.info("📅 Fecha Inicio recibida del frontend: {}", request.getFechaInicio());
        log.info("📅 Fecha Fin recibida del frontend: {}", request.getFechaFin());
        log.info("🏷️  Estados CSV recibido del frontend: {}", request.getEstadosCsv());

        String estadosValidados = normalizarEstadosCsv(request.getEstadosCsv());

        log.info("🏷️  Estados NORMALIZADOS después de validación: {}", estadosValidados);
        log.info("✅ Llamando al service con: fechaInicio={}, fechaFin={}, estados={}",
                request.getFechaInicio(), request.getFechaFin(), estadosValidados);

        ResumenHistoricoResponse response = pedidoService.obtenerResumenHistorico(
                request.getFechaInicio(),
                request.getFechaFin(),
                estadosValidados
        );

        log.info("✅ Response recibida del service: {} productos distintos, {} pedidos",
                response.getTotalProductosDistintos(), response.getTotalPedidos());
        log.info("=== FIN obtenerResumenHistorico ===\n");

        return ResponseEntity.status(200).body(response);
    }

    private String normalizarEstadosCsv(String estadosCsv) {
        if (estadosCsv == null || estadosCsv.isBlank()) {
            return "";
        }

        String[] estadosNormalizados = Arrays.stream(estadosCsv.trim().split(","))
                .map(String::trim)
                .map(StringUtils::normalizeToEnumKey)
                .toArray(String[]::new);

        validarEstadosValidos(estadosNormalizados);

        return String.join(",", estadosNormalizados);
    }

    private void validarEstadosValidos(String[] estadosRecibidos) {
        String[] estadosValidos = {"PENDIENTE", "APROBADO", "ENTREGADO", "RECHAZADO"};

        for (String estado : estadosRecibidos) {
            if (estado == null || estado.isBlank()) continue;
            boolean esValido = Arrays.stream(estadosValidos).anyMatch(e -> e.equals(estado.trim()));
            if (!esValido) {
                throw new IllegalArgumentException("Estado inválido: '" + estado +
                    "'. Estados válidos: PENDIENTE, APROBADO, ENTREGADO, RECHAZADO");
            }
        }
    }
}
