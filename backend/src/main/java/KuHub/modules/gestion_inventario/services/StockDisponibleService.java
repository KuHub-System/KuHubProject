package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleInventarioPage;
import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleRealPage;
import KuHub.modules.gestion_inventario.dtos.response.record.SobranteBodegaPeriodoPage;

import java.time.LocalDate;

public interface StockDisponibleService {

    /** Retorna página paginada del disponible real por producto, filtrable por categoría y búsqueda de nombre. */
    DisponibleRealPage listarDisponibleReal(String busqueda, Integer idCategoria, int page);

    /**
     * Disponible EN INVENTARIO por producto, calculado en vivo: del stock que hoy está físicamente
     * en inventario, cuánto no está comprometido con solicitudes EN_PEDIDO, descontando primero la
     * parte del compromiso que ya se abasteció a bodega de tránsito (si no, se restaría dos veces).
     */
    DisponibleInventarioPage listarDisponibleInventario(String busqueda, Integer idCategoria, int page);

    /**
     * Sobrante en Bodega de Tránsito para un período: stock físico de bodega menos la demanda de
     * las solicitudes EN_PEDIDO pendientes cuya fecha_solicitada cae dentro del rango.
     */
    SobranteBodegaPeriodoPage listarBodegaTransitoPeriodo(
            LocalDate fechaInicio, LocalDate fechaFin, int page, Integer idCategoria, String busqueda);
}
