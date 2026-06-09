package KuHub.modules.gestion_pedido.services;

import KuHub.modules.gestion_pedido.dtos.response.ResumenHistoricoResponse;
import KuHub.modules.gestion_pedido.record.ChangePedidoStatusDTO;
import KuHub.modules.gestion_pedido.record.CreateOrder;
import KuHub.modules.gestion_pedido.record.PedidoDashboardRecords;
import KuHub.modules.gestion_pedido.record.PrepararEntregaDTO;
import KuHub.modules.gestion_solicitud.dtos.request.DateRangeDTO;
import KuHub.modules.gestion_solicitud.dtos.respose.record.NotificacionSemanaDTO;

import java.time.LocalDate;
import java.util.List;

public interface PedidoService {

    PedidoDashboardRecords.PedidoDashboardResponse obtenerDashboardPedidos(DateRangeDTO request);
    boolean consolidateOrder(CreateOrder request);

    /**
     * Cambia el estado de uno o varios pedidos de forma masiva.
     * Retorna true si al menos una fila fue afectada.
     */
    boolean changeMassiveStatus(ChangePedidoStatusDTO request);

    /**
     * Retorna las entregas diarias para Bodega de Tránsito:
     * solicitudes ACEPTADA de pedidos APROBADO, agrupadas por fecha → sala → horario.
     * Incluye stockTransito y diferencia por producto.
     */
    List<PedidoDashboardRecords.EntregaDiariaBodegaJson> obtenerEntregasDiarias(DateRangeDTO request);

    /**
     * Prepara la entrega de una solicitud:
     * descuenta los productos de bodega de tránsito (SALIDA_BODEGA) y pasa
     * la solicitud a estado PROCESADO.
     * Maneja desincronización de stock (no revierte) y stock insuficiente (revierte).
     */
    String prepararEntrega(PrepararEntregaDTO request);

    /**
     * Obtiene resumen histórico de productos consumidos en pedidos.
     * Calcula: total de productos distintos, total de pedidos, y detalle por producto.
     * Filtra por rango de fechas y estados de pedido (CSV validado).
     */
    ResumenHistoricoResponse obtenerResumenHistorico(LocalDate fechaInicio, LocalDate fechaFin, String estadosCsv);

    /** Devuelve los pedidos en estado PENDIENTE agrupados por semana académica (para notificaciones). */
    List<NotificacionSemanaDTO> obtenerNotificacionesPedidosPendientes();
}
