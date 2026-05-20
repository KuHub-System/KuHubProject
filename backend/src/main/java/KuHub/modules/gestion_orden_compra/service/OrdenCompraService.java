package KuHub.modules.gestion_orden_compra.service;

import KuHub.modules.gestion_orden_compra.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_compra.dtos.response.PedidoSemanaResumenDTO;

import java.time.LocalDate;
import java.util.List;

/**
 * Interfaz del servicio de gestión de órdenes de compra (Tarea #13).
 * Define los métodos públicos disponibles para el controller.
 */
public interface OrdenCompraService {

    /**
     * Lista los pedidos con estado APROBADO cuyas fechas caen dentro del rango indicado,
     * incluyendo un contador de cuántas OCs activas tiene cada pedido.
     * Consumido por el Paso 1 del modal "Generar Orden de Compra".
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
}
