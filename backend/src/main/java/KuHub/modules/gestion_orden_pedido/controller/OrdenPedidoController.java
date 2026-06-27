package KuHub.modules.gestion_orden_pedido.controller;

import KuHub.modules.gestion_orden_pedido.dtos.request.CambiarEstadoOrdenPedidoDTO;
import KuHub.modules.gestion_orden_pedido.dtos.request.OrdenPedidoCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.request.ReservaStockSolicitudCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.AbastecimientoProveedorDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.DisponibleRealDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.NotificacionEntregaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoConDetallesDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoDetalleDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoListDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoResumenDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.PedidoSemanaResumenDTO;
import KuHub.modules.gestion_orden_pedido.service.OrdenPedidoService;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controlador REST para la gestión de Órdenes de Pedido.
 * Expone endpoints que facilitan la consolidación de pedidos, cálculo de menor precio
 * y la generación formal de órdenes de compra destinadas a proveedores.
 * 
 * Ruta base: /api/v1/orden-pedido
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
     * Lista los pedidos unificados con estado APROBADO cuyas fechas caen dentro del rango especificado,
     * incluyendo el contador de cuántas órdenes de pedido (OP) activas ya tiene cada pedido.
     * 
     * 💻 INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerPedidosSemanaService()}
     * - **Componente/Pantalla:** {@code frontend/src/pages/gestion-proveedores.tsx} (Modal de Generación de Órdenes de Compra, Paso 1: Selección de Pedidos).
     *
     * @param fechaInicio Fecha límite inferior del rango (YYYY-MM-DD)
     * @param fechaFin    Fecha límite superior del rango (YYYY-MM-DD)
     * @return Respuesta HTTP con la lista de pedidos de la semana y sus indicadores de OP
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
     * Obtiene la cotización consolidada y optimizada para los pedidos consolidados indicados.
     * Agrupa jerárquicamente la demanda por proveedor → categoría → producto, pre-seleccionando
     * de forma automática al proveedor que ofrezca el menor precio neto vigente.
     * 
     * 💻 INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code obtenerCotizacionConsolidadaService()}
     * - **Componente/Pantalla:** {@code frontend/src/pages/gestion-proveedores.tsx} (Modal de Generación de Órdenes de Compra, Paso 2: Vista Previa, desglose de costos y asignación de fechas de entrega).
     *
     * @param idsPedido Lista de IDs de pedidos consolidated semanales (enviados como CSV en la URL)
     * @return Respuesta HTTP con la cotización consolidada agrupada por proveedor
     */
    @GetMapping("/cotizacion-consolidada")
    public ResponseEntity<CotizacionConsolidadaDTO.CotizacionConsolidadaResponse> obtenerCotizacionConsolidada(
            @RequestParam List<Integer> idsPedido
    ) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.obtenerCotizacionConsolidada(idsPedido));
    }

    /**
     * Cotización filtrada para re-generar OPs canceladas. Retorna solo los productos que
     * formaban parte de las OPs CANCELADAS de los pedidos indicados; comportamiento idéntico
     * al flujo normal (proveedor menor precio, distribución por día, mover solicitudes).
     *
     * 💻 INTEGRACIÓN CON EL FRONTEND:
     * - **Servicio frontend:** {@code obtenerCotizacionDeCanceladasService} en proveedor-service.ts
     * - **Pantalla:** Modal "Generar Orden Pedido" (Paso 2) cuando el pedido tiene chip "Existe un registro cancelado".
     *
     * GET /api/v1/orden-pedido/cotizacion-de-canceladas?idsPedido=1,2
     */
    @GetMapping("/cotizacion-de-canceladas")
    public ResponseEntity<CotizacionConsolidadaDTO.CotizacionConsolidadaResponse> obtenerCotizacionDeCanceladas(
            @RequestParam List<Integer> idsPedido
    ) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.obtenerCotizacionDeCanceladas(idsPedido));
    }

    /**
     * Disponible real por producto = (inventario + bodega de tránsito) − demanda comprometida
     * (Σ demanda de solicitudes EN_PEDIDO ya abastecidas, vía la puente detalle_orden_pedido_solicitud).
     * Permite ver, al generar la OP, cuánto sobra de cada producto para pedir menos al proveedor.
     *
     * 💻 INTEGRACIÓN CON EL FRONTEND:
     * - **Servicio frontend:** {@code obtenerDisponibleRealService} en proveedor-service.ts
     * - **Pantalla:** Modal "Generar Orden Pedido" (Paso 2), columna "Disponible" por producto.
     *
     * GET /api/v1/orden-pedido/disponible-real?idsProducto=1,2,3
     */
    @GetMapping("/disponible-real")
    public ResponseEntity<List<DisponibleRealDTO>> obtenerDisponibleReal(
            @RequestParam List<Integer> idsProducto
    ) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.obtenerDisponibleReal(idsProducto));
    }

    /**
     * Registra las reservas de stock cubierto por solicitud (upsert) generadas al marcar
     * "cubrir con disponible" en el Paso 2. Hace que ese stock deje de aparecer como disponible.
     *
     * 💻 INTEGRACIÓN CON EL FRONTEND:
     * - **Servicio frontend:** {@code registrarReservasStockService} en proveedor-service.ts
     * - **Pantalla:** Modal "Generar Orden Pedido" (Paso 2), al confirmar con "cubrir con disponible".
     *
     * POST /api/v1/orden-pedido/reservas
     */
    @PostMapping("/reservas")
    public ResponseEntity<Integer> registrarReservasStock(
            @Validated @RequestBody List<ReservaStockSolicitudCreateDTO> reservas
    ) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.registrarReservasStock(reservas));
    }

    /**
     * Reserva el disponible real de los productos de un pedido completo, asociándolo a las
     * solicitudes EN_PEDIDO del pedido (reparte la cobertura entre ellas). Idempotente.
     *
     * 💻 INTEGRACIÓN CON EL FRONTEND:
     * - **Servicio frontend:** {@code reservarDisponiblePedidoService} en solicitud-service.ts
     * - **Pantalla:** Conglomerado de Pedidos → Aprobación → modal "¿Reservar disponibles?" al aprobar.
     *
     * POST /api/v1/orden-pedido/reservar-disponible/{idPedido}
     */
    @PostMapping("/reservar-disponible/{idPedido}")
    public ResponseEntity<Integer> reservarDisponiblePedido(@PathVariable Integer idPedido) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.reservarDisponiblePedido(idPedido));
    }

    // ══════════════════════════════════════════════════════════════
    // CREAR ORDEN DE PEDIDO — Paso 2 botón "Generar Orden de Compra"
    // ══════════════════════════════════════════════════════════════

    /**
     * Registra una nueva Orden de Pedido con sus correspondientes entregas de productos por fecha,
     * guardando un snapshot con los precios unitarios neto y con IVA vigentes al momento del registro.
     * Solo se procesan líneas de entrega que posean una cantidad superior a cero.
     * 
     * 💻 INTEGRACIÓN CON EL FRONTEND:
     * - **Implementado:** Sí.
     * - **Servicio frontend:** {@code frontend/src/services/proveedor-service.ts} -> {@code crearOrdenPedidoService()}
     * - **Componente/Pantalla:** {@code frontend/src/pages/gestion-proveedores.tsx} (Accionado al presionar el botón "Generar Orden de Compra" para cada proveedor en el Paso 2).
     *
     * @param request DTO con la información de cabecera y lista de entregas programadas
     * @return Respuesta HTTP con el DTO detallado de la orden creada
     */
    @PostMapping
    public ResponseEntity<OrdenPedidoDetalleDTO> crearOrdenPedido(
            @Validated @RequestBody OrdenPedidoCreateDTO request
    ) {
        return ResponseEntity
                .status(201)
                .body(ordenPedidoService.crearOrdenPedido(request));
    }

    // ══════════════════════════════════════════════════════════════
    // ABASTECIMIENTO DE PROVEEDORES — OPs CONFIRMADA por fecha de entrega
    // ══════════════════════════════════════════════════════════════

    /**
     * Retorna las OPs con estado CONFIRMADA agrupadas por OP → día de entrega → productos.
     * Siempre incluye historial de 15 días hacia atrás. El parámetro fechaHasta controla
     * el límite superior (filtros del frontend: semana, 30 días, 3 meses, todas).
     * Incluye datos del proveedor y la marca del producto registrada en proveedor_producto.
     * Usado por el modal de abastecimiento de proveedores en Control de Stock Masivo.
     *
     * GET /api/v1/orden-pedido/abastecimiento?fechaHasta=2026-06-30&tipoAbastecimiento=INVENTARIO
     * tipoAbastecimiento: "INVENTARIO" (inventario.tsx) | "BODEGA_TRANSITO" (bodega-transito.tsx)
     * ✅ En uso: Consumido por obtenerAbastecimientoConfirmadoService en proveedor-service.ts.
     */
    @GetMapping("/abastecimiento")
    public ResponseEntity<AbastecimientoProveedorDTO> obtenerAbastecimiento(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(required = false, defaultValue = "INVENTARIO") String tipoAbastecimiento
    ) {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.obtenerAbastecimientoConfirmado(fechaHasta, tipoAbastecimiento));
    }

    // ══════════════════════════════════════════════════════════════
    // LISTADO Y DETALLE — Vista "Órdenes de Pedido"
    // ══════════════════════════════════════════════════════════════

    /**
     * Retorna las Órdenes de Pedido activas con su cabecera (proveedor, rango del pedido,
     * estado, totales). No incluye las líneas de detalle para mantener el payload liviano.
     *
     * @param diasAtras opcional — filtra OPs creadas en los últimos N días. Omitir o null = todas.
     *
     * GET /api/v1/orden-pedido?diasAtras=30
     * ✅ En uso: Consumido por listarOrdenesPedidoService en proveedor-service.ts.
     */
    @GetMapping
    public ResponseEntity<List<OrdenPedidoListDTO>> listarOrdenes(
            @RequestParam(required = false) Integer diasAtras) {
        return ResponseEntity.ok(ordenPedidoService.listarOrdenes(diasAtras));
    }

    /**
     * Retorna el detalle completo de una Orden de Pedido: cabecera + líneas de entrega
     * con producto, cantidad, fecha exacta y precios snapshot.
     *
     * GET /api/v1/orden-pedido/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrdenPedidoConDetallesDTO> obtenerConDetalles(@PathVariable Integer id) {
        return ResponseEntity.ok(ordenPedidoService.obtenerConDetalles(id));
    }

    /**
     * Lista las OPs activas de un pedido (estado + proveedor) para el modal de rechazo de pedido.
     * ✅ En uso: Consumido por obtenerOrdenesPorPedidoService en solicitud-service.ts (Conglomerado · Por Pedido).
     *
     * GET /api/v1/orden-pedido/resumen-por-pedido/{idPedido}
     */
    @GetMapping("/resumen-por-pedido/{idPedido}")
    public ResponseEntity<List<OrdenPedidoResumenDTO>> obtenerResumenPorPedido(@PathVariable Integer idPedido) {
        return ResponseEntity.status(200).body(ordenPedidoService.obtenerResumenPorPedido(idPedido));
    }

    /**
     * Cambia el estado de una Orden de Pedido validando las transiciones permitidas.
     *
     * PATCH /api/v1/orden-pedido/{id}/estado
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<OrdenPedidoListDTO> cambiarEstado(
            @PathVariable Integer id,
            @Validated @RequestBody CambiarEstadoOrdenPedidoDTO dto
    ) {
        return ResponseEntity.ok(ordenPedidoService.cambiarEstado(id, dto.getEstado()));
    }

    // ══════════════════════════════════════════════════════════════
    // MARCAR DETALLES COMO ENTREGADOS — Control masivo de stock
    // ══════════════════════════════════════════════════════════════

    /**
     * Marca como entregados (entregado = true) en bloque los DetalleOrdenPedido indicados.
     * Se invoca en paralelo con el bulk update de inventario al confirmar la recepción desde el
     * Control de Stock Masivo en la página de inventario.
     *
     * PATCH /api/v1/orden-pedido/detalles/entregar
     * ✅ En uso: Consumido por marcarEntregadosMasivoService en proveedor-service.ts.
     */
    @PatchMapping("/detalles/entregar")
    public ResponseEntity<Integer> marcarDetallesEntregados(@RequestBody List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.status(200).body(0);
        }
        return ResponseEntity.status(200).body(ordenPedidoService.marcarDetallesEntregados(ids));
    }

    /**
     * Evalúa todas las OPs CONFIRMADAS activas y transiciona a RECIBIDA las que tienen
     * todos sus detalles activos con entregado=true.
     * Llamado silenciosamente al presionar "Actualizar" en la vista de Órdenes de Pedido.
     *
     * POST /api/v1/orden-pedido/sincronizar-estados
     * ✅ En uso: sincronizarEstadosOrdenPedidoService en proveedor-service.ts
     */
    @PostMapping("/sincronizar-estados")
    public ResponseEntity<Integer> sincronizarEstados() {
        return ResponseEntity.ok(ordenPedidoService.sincronizarEstadosRecibida());
    }

    /**
     * Devuelve los pedidos APROBADOS sin OP activa (o con todas CANCELADAS) agrupados por semana.
     * Notifica al gestor de pedidos que debe generar la orden de pedido para esas semanas.
     *
     * GET /api/v1/orden-pedido/notificacion-sin-op-lista
     * ✅ En uso: Consumido por obtenerNotificacionesPedidosSinOp en notification-service.ts.
     */
    @GetMapping("/notificacion-sin-op-lista")
    public ResponseEntity<List<NotificacionSemanaDTO>> notificacionPedidosSinOp() {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.obtenerNotificacionesPedidosSinOp());
    }

    /**
     * Devuelve las OPs CONFIRMADAS con entregas programadas para hoy o ayer
     * que aún tienen detalles sin marcar como entregados.
     * Notificación informativa: avisa que hay abastecimiento activo sin completar.
     *
     * GET /api/v1/orden-pedido/notificacion-entregas-hoy
     * ✅ En uso: Consumido por obtenerNotificacionesEntregas en notification-service.ts.
     */
    @GetMapping("/notificacion-entregas-hoy")
    public ResponseEntity<List<NotificacionEntregaDTO>> notificacionEntregasHoy() {
        return ResponseEntity
                .status(200)
                .body(ordenPedidoService.obtenerNotificacionesEntregas());
    }
}
