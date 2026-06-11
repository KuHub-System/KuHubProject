package KuHub.modules.gestion_orden_pedido.service;

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
import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;

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
     * Calcula el disponible real por producto = (inventario + bodega de tránsito) − demanda
     * comprometida (Σ demanda de solicitudes EN_PEDIDO ya abastecidas, vía la puente). Sirve para
     * que el usuario, al generar la OP, vea cuánto le sobra de cada producto y pida menos.
     *
     * @param idsProducto IDs de los productos a evaluar
     * @return Lista con stock físico, demanda comprometida y disponible por producto
     */
    List<DisponibleRealDTO> obtenerDisponibleReal(List<Integer> idsProducto);

    /**
     * Registra (upsert) las reservas de stock cubierto por solicitud generadas con "cubrir con
     * disponible". Cada (solicitud, producto) tiene una sola reserva; si ya existe se actualiza.
     *
     * @param reservas Lista de reservas a registrar
     * @return Cantidad de reservas registradas/actualizadas
     */
    int registrarReservasStock(List<ReservaStockSolicitudCreateDTO> reservas);

    /**
     * Reserva el disponible real de los productos de un pedido completo, asociándolo a las solicitudes
     * EN_PEDIDO de ese pedido. Por cada producto con disponible &gt; 0 cubre como máximo su demanda
     * dentro del pedido, repartiendo la cobertura entre las solicitudes que lo piden (orden por fecha)
     * y haciendo upsert en {@code reserva_stock_solicitud}. Se invoca al aprobar el pedido si el usuario
     * acepta reservar; es idempotente.
     *
     * @param idPedido ID del pedido consolidado a reservar
     * @return Cantidad de reservas registradas/actualizadas
     */
    int reservarDisponiblePedido(Integer idPedido);

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
     * @param fechaHasta         Límite superior de fechaEntrega. null = sin límite (usa 2099-12-31).
     * @param tipoAbastecimiento Valor del ENUM: "INVENTARIO" o "BODEGA_TRANSITO".
     * @return Wrapper con la lista de órdenes de abastecimiento
     */
    AbastecimientoProveedorDTO obtenerAbastecimientoConfirmado(LocalDate fechaHasta, String tipoAbastecimiento);

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

    /**
     * Evalúa TODAS las OPs CONFIRMADAS activas y transiciona a RECIBIDA las que tienen
     * todos sus detalles activos con entregado=true.
     * Llamado desde el botón "Actualizar" en la vista de Órdenes de Pedido para corregir
     * datos históricos o inconsistencias que no pasaron por marcarDetallesEntregados.
     *
     * @return Número de OPs transicionadas a RECIBIDA
     */
    int sincronizarEstadosRecibida();

    /**
     * Lista las Órdenes de Pedido activas de un pedido con su estado y proveedor. Se usa para poblar
     * el modal de rechazo de pedido (Conglomerado · Por Pedido) y advertir al usuario qué OPs se
     * cancelarían junto con el pedido.
     *
     * @param idPedido PK del pedido consolidado
     * @return Lista de resúmenes de OP (idOrdenPedido, estado, nombreProveedor)
     */
    List<OrdenPedidoResumenDTO> obtenerResumenPorPedido(Integer idPedido);

    /** Devuelve los pedidos APROBADOS sin OP activa (o con todas CANCELADAS) agrupados por semana. */
    List<NotificacionSemanaDTO> obtenerNotificacionesPedidosSinOp();

    /** Devuelve OPs CONFIRMADAS con entregas programadas para hoy o ayer que aún no fueron marcadas como entregadas. */
    List<NotificacionEntregaDTO> obtenerNotificacionesEntregas();
}
