package KuHub.modules.gestion_orden_compra.controller;

import KuHub.modules.gestion_orden_compra.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_compra.dtos.response.PedidoSemanaResumenDTO;
import KuHub.modules.gestion_orden_compra.service.OrdenCompraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller REST para gestión de Órdenes de Compra (Tarea #13).
 * Endpoints base: /api/v1/orden-compra
 */
@RestController
@Validated
@RequestMapping("/api/v1/orden-compra")
public class OrdenCompraController {

    @Autowired
    private OrdenCompraService ordenCompraService;

    // ══════════════════════════════════════════════════════════════
    // PASO 1 — Pedidos APROBADO de la semana + contador de OC
    // ══════════════════════════════════════════════════════════════

    /**
     * Lista los pedidos APROBADO cuyas fechas caen dentro del rango indicado,
     * con la cantidad de OCs activas que ya tiene cada pedido.
     * El frontend mapea {@code cantidadOrdenCompra} a un chip:
     * 0 → "Sin OC" | 1 → "OC Generada" | ≥2 → "Ya existe un registro para este pedido".
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
                .body(ordenCompraService.listarPedidosSemana(fechaInicio, fechaFin));
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
                .body(ordenCompraService.obtenerCotizacionConsolidada(idsPedido));
    }
}
