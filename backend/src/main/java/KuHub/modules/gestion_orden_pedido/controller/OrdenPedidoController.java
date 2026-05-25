package KuHub.modules.gestion_orden_pedido.controller;

import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
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
 * Controller REST para gestión de Órdenes de Pedido (Tarea #13).
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
     * El frontend mapea {@code cantidadOrdenPedido} a un chip:
     * 0 → "Sin OP" | 1 → "OP Generada" | ≥2 → "Ya existe un registro para este pedido".
     * ⬜ Sin uso frontend aún. Pendiente integración en gestion-proveedores.tsx (Tarea #18).
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
     * Cada producto se asigna al proveedor con menor {@code precio_neto} vigente; las cantidades son la
     * SUMA de {@code detalle_pedido.cant_producto_pedido} entre los pedidos indicados; los precios neto
     * y con IVA salen del {@code proveedor_producto} del proveedor ganador.
     * ⬜ Sin uso frontend aún. Pendiente integración en gestion-proveedores.tsx (Tarea #19).
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
}
