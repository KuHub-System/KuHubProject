package KuHub.modules.gestion_pedido.controller;

import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_pedido.record.ChangePedidoStatusDTO;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.record.PedidoDashboardRecords;
import KuHub.modules.gestion_pedido.record.PrepararEntregaDTO;
import java.util.List;
import java.util.Map;
import KuHub.modules.gestion_pedido.services.PedidoService;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;


@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/pedido")
public class PedidoController {

    @Autowired
    private PedidoService pedidoService;

    @PostMapping("/consolidate")
    public ResponseEntity<PedidoDashboardRecords.PedidoDashboardResponse> consultaGOD(
            @Validated @RequestBody DateRangeDTO request){
        return ResponseEntity
                .status(200)
                .body(pedidoService.obtenerDashboardPedidos(request));
    }

    @PostMapping("/consolidate-order")
    public ResponseEntity<Boolean> consolidateOrder(
            @Validated @RequestBody CreateOrder request){
        return ResponseEntity
                .status(201)
                .body(pedidoService.consolidateOrder(request));
    }

    /** ✅✅ En uso: Entregas diarias para Bodega de Tránsito.
     *  Solicitudes PROCESADO en pedidos APROVADO, agrupadas por fecha → sala → horario.
     *  Ejemplo: POST /api/v1/pedido/entregas-diarias
     *  Body: { "fechaInicio": "2026-03-24", "fechaFin": "2026-03-28" }
     */
    @PostMapping("/entregas-diarias")
    public ResponseEntity<List<PedidoDashboardRecords.EntregaDiariaBodegaJson>> obtenerEntregasDiarias(
            @Validated @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(pedidoService.obtenerEntregasDiarias(request));
    }

    /**
     * Prepara la entrega de una solicitud ACEPTADA:
     * descuenta los productos de bodega de tránsito (SALIDA_BODEGA) y marca
     * la solicitud como PROCESADO.
     *
     * Respuestas:
     *  200 OK      → entrega preparada correctamente
     *  409 CONFLICT → entrega realizada pero con stock desincronizado (frontend debe refrescar)
     *  422 UNPROCESSABLE_ENTITY → stock insuficiente, no se realizó ningún cambio
     *
     * Ejemplo: POST /api/v1/pedido/preparar-entrega
     * Body: { "idSolicitud": 5, "productos": [{ "idProducto": 3, "stockEnVista": 6.2, "cantidadAEntregar": 0.153 }] }
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

    /** ✅✅ En uso: Cambia el estado de uno o varios pedidos de forma masiva.
     *  Retorna true si al menos una fila fue afectada, junto con las filas modificadas.
     *  Ejemplo: PATCH /api/v1/pedido/change-massive-status
     *  Body: { "idsPedidos": [1, 2], "estado": "APROVADO" }
     */
    @PatchMapping("/change-massive-status")
    public ResponseEntity<Boolean> changeMassiveStatus(
            @Validated @RequestBody ChangePedidoStatusDTO request){
        return ResponseEntity
                .status(200)
                .body(pedidoService.changeMassiveStatus(request));
    }
}
