package KuHub.modules.gestion_pedido.controller;

import KuHub.modules.gestion_pedido.record.ChangePedidoStatusDTO;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.record.PedidoDashboardRecords;
import java.util.List;
import KuHub.modules.gestion_pedido.services.PedidoService;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
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
    public ResponseEntity<List<PedidoDashboardRecords.EntregaDiariaJson>> obtenerEntregasDiarias(
            @Validated @RequestBody DateRangeDTO request) {
        return ResponseEntity
                .status(200)
                .body(pedidoService.obtenerEntregasDiarias(request));
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
