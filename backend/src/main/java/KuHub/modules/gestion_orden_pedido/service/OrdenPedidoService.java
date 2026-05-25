package KuHub.modules.gestion_orden_pedido.service;

import KuHub.modules.gestion_orden_pedido.dtos.request.OrdenPedidoCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoDetalleDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.PedidoSemanaResumenDTO;

import java.time.LocalDate;
import java.util.List;

/**
 * Interfaz del servicio de gestión de órdenes de pedido (Tarea #13 + #27).
 * Define los métodos públicos disponibles para el controller.
 */
public interface OrdenPedidoService {

    /**
     * Lista los pedidos con estado APROBADO cuyas fechas caen dentro del rango indicado,
     * incluyendo un contador de cuántas OPs activas tiene cada pedido.
     * Consumido por el Paso 1 del modal "Generar Orden Pedido".
     */
    List<PedidoSemanaResumenDTO> listarPedidosSemana(LocalDate fechaInicio, LocalDate fechaFin);

    /**
     * Cotización consolidada del Paso 2: agrupa por proveedor → categoría → producto,
     * asignando cada producto al proveedor con menor {@code precio_neto} vigente.
     * Las cantidades provienen de {@code SUM(detalle_pedido.cant_producto_pedido)} de
     * los pedidos indicados; los precios neto y con IVA salen del {@code proveedor_producto}
     * vigente del proveedor ganador.
     */
    CotizacionConsolidadaDTO.CotizacionConsolidadaResponse obtenerCotizacionConsolidada(List<Integer> idsPedido);

    /**
     * Crea una Orden de Pedido para un proveedor.
     * Una llamada por proveedor; el frontend invoca este endpoint una vez por cada proveedor.
     * Cada entrega con cantidad > 0 genera un {@code detalle_orden_pedido} con su {@code fecha_entrega}.
     * POST /api/v1/orden-pedido
     */
    OrdenPedidoDetalleDTO crearOrdenPedido(OrdenPedidoCreateDTO request);
}
