package KuHub.modules.gestion_orden_pedido.controller;

import KuHub.modules.gestion_orden_pedido.dtos.request.OrdenPedidoCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoDetalleDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.PedidoSemanaResumenDTO;
import KuHub.modules.gestion_orden_pedido.service.OrdenPedidoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller REST para gestión de Órdenes de Pedido (Tarea #13 + #27).
 * Endpoints base: /api/v1/orden-pedido
 */
@RestController
@Validated
@RequestMapping("/api/v1/orden-pedido")
public class OrdenPedidoController {

    @Autowired
    private OrdenPedidoService ordenPedidoService;

    // ══════════════════════════════════════════════════════════════
    // PASO 1 — Pedidos APROBADO de la semana + contador de OP
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista los pedidos APROBADO cuyas fechas caen dentro del rango indicado,
     * con la cantidad de OPs activas que ya tiene cada pedido.
     * ✅ En uso: Consumido por gestion-proveedores.tsx (modal Paso 1).
     *
     * @param fechaInicio Fecha de inicio del rango (YYYY-MM-DD)
     * @param fechaFin    Fecha de fin del rango (YYYY-MM-DD)
     */
    @GetMapping("/pedidos-semana")
    public ResponseEntity<List<PedidoSemanaResumenDTO>> obtenerPedidosSemana(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin
    ) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.listarPedidosSemana(fechaInicio, fechaFin));
    }

    // ══════════════════════════════════════════════════════════════
    // PASO 2 — Cotización consolidada (menor precio por proveedor)
    // ══════════════════════════════════════════════════════════════

    /**
     * Cotización consolidada de los pedidos seleccionados, agrupada por proveedor → categoría → producto.
     * ✅ En uso: Consumido por gestion-proveedores.tsx (modal Paso 2).
     *
     * @param idsPedido Lista de IDs de pedidos (en query string como CSV: ?idsPedido=1,2,3)
     */
    @GetMapping("/cotizacion-consolidada")
    public ResponseEntity<CotizacionConsolidadaDTO.CotizacionConsolidadaResponse> obtenerCotizacionConsolidada(
            @RequestParam List<Integer> idsPedido
    ) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.obtenerCotizacionConsolidada(idsPedido));
    }

    // ══════════════════════════════════════════════════════════════
    // CREAR ORDEN DE PEDIDO — Paso 2 botón "Generar Orden de Compra"
    // ══════════════════════════════════════════════════════════════

    /**
     * Crea una Orden de Pedido para un proveedor con sus líneas de detalle por fecha de entrega.
     * El frontend llama este endpoint una vez por proveedor seleccionado en el Paso 2.
     * Solo se envían filas con cantidad > 0.
     * ✅ En uso: Consumido por gestion-proveedores.tsx (botón "Generar Orden de Compra").
     */
    @PostMapping
    public ResponseEntity<OrdenPedidoDetalleDTO> crearOrdenPedido(
            @Validated @RequestBody OrdenPedidoCreateDTO request
    ) {
        return ResponseEntity
                .status(201)
                .body(ordenPedidoService.crearOrdenPedido(request));
    }
}
