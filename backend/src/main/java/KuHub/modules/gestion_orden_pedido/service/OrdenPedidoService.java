package KuHub.modules.gestion_orden_pedido.service;

import KuHub.modules.gestion_orden_pedido.dtos.request.OrdenPedidoCreateDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.AbastecimientoProveedorDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.CotizacionConsolidadaDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoConDetallesDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoDetalleDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.OrdenPedidoListDTO;
import KuHub.modules.gestion_orden_pedido.dtos.response.PedidoSemanaResumenDTO;
import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;

import java.time.LocalDate;
import java.util.List;

/**
 * Interfaz del servicio de negocio para la gestión de Órdenes de Pedido.
 * Centraliza las operaciones requeridas para el flujo de consolidación de compras a proveedores:
 * listar pedidos aprobados, generar cotizaciones unificadas con el menor precio y crear órdenes de pedido
 * con snapshot de precios.
 */
public interface OrdenPedidoService {

    /**
     * Obtiene el listado de pedidos consolidados con estado APROBADO cuyas fechas de entrega estimadas
     * se encuentran dentro del rango especificado.
     * Incluye un contador con la cantidad de órdenes de pedido (OP) activas ya generadas para cada pedido.
     *
     * @param fechaInicio Límite inferior del rango de búsqueda de pedidos
     * @param fechaFin Límite superior del rango de búsqueda de pedidos
     * @return Lista de DTOs con el resumen de cada pedido de la semana y su contador de OP correspondientes
     */
    List<PedidoSemanaResumenDTO> listarPedidosSemana(LocalDate fechaInicio, LocalDate fechaFin);

    /**
     * Genera una cotización consolidada agrupando y analizando un conjunto de pedidos seleccionados.
     * Realiza un desglose jerárquico de productos por proveedor, categoría y producto, asignando de forma
     * automática cada producto al proveedor que ofrezca el menor precio neto unitario vigente.
     *
     * Las cantidades consolidadas se calculan sumando las demandas individuales de los productos de cada
     * pedido, y los precios corresponden al catálogo activo del proveedor seleccionado.
     *
     * @param idsPedido Lista de IDs de los pedidos consolidados semanales a agrupar
     * @return Objeto de respuesta que contiene la estructura jerárquica de la cotización consolidada
     */
    CotizacionConsolidadaDTO.CotizacionConsolidadaResponse obtenerCotizacionConsolidada(List<Integer> idsPedido);

    /**
     * Registra una nueva Orden de Pedido para un proveedor y pedido unificado específico.
     * Genera de forma automatizada las líneas de detalle para cada producto y fecha de entrega programada,
     * obteniendo los precios neto y con IVA vigentes del proveedor para crear el histórico congelado (snapshot).
     *
     * @param request Datos del DTO de creación, que contiene el pedido, proveedor, observaciones y lista de entregas
     * @return DTO con el resumen de la orden de pedido creada y el número total de líneas persistidas
     */
    OrdenPedidoDetalleDTO crearOrdenPedido(OrdenPedidoCreateDTO request);

    /**
     * Retorna OPs activas con estado CONFIRMADA, agrupadas por OP → día de entrega → productos.
     * Siempre incluye historial de hasta 15 días hacia atrás desde la fecha actual.
     * Cada producto incluye la marca registrada en el catálogo del proveedor (proveedor_producto).
     *
     * @param fechaHasta Límite superior de fechaEntrega. null = sin límite (usa 2099-12-31).
     * @return Wrapper con la lista de órdenes de abastecimiento
     */
    AbastecimientoProveedorDTO obtenerAbastecimientoConfirmado(LocalDate fechaHasta);

    /**
     * Retorna las Órdenes de Pedido activas con sus datos de cabecera.
     *
     * @param diasAtras si no es null, filtra solo las OPs creadas en los últimos N días; null = todas
     * @return Lista ordenada por fecha de creación descendente
     */
    List<OrdenPedidoListDTO> listarOrdenes(Integer diasAtras);

    /**
     * Retorna el detalle completo de una Orden de Pedido: cabecera + todas las líneas de
     * entrega (producto, cantidad, fecha exacta, precios snapshot).
     *
     * @param idOrdenPedido PK de la orden
     * @return DTO con cabecera y lista de detalles
     */
    OrdenPedidoConDetallesDTO obtenerConDetalles(Integer idOrdenPedido);

    /**
     * Cambia el estado de una Orden de Pedido validando las transiciones permitidas.
     * Transiciones válidas:
     * PENDIENTE  → ENVIADA | CANCELADA
     * ENVIADA    → CONFIRMADA | PENDIENTE | CANCELADA
     * CONFIRMADA → RECIBIDA | ENVIADA | CANCELADA
     * RECIBIDA   → (terminal, sin transiciones)
     * CANCELADA  → PENDIENTE
     *
     * @param idOrdenPedido PK de la orden
     * @param nuevoEstado   Estado destino
     * @return DTO con el resumen actualizado
     */
    OrdenPedidoListDTO cambiarEstado(Integer idOrdenPedido, EstadoOrdenPedido nuevoEstado);

    /**
     * Marca como entregados (entregado = true) en bloque los DetalleOrdenPedido indicados.
     * Se invoca en paralelo con el control masivo de stock al confirmar la recepción desde la bodega.
     *
     * @param ids Lista de IDs de detalle_orden_pedido a marcar
     * @return Número de filas actualizadas
     */
    int marcarDetallesEntregados(List<Long> ids);
}
