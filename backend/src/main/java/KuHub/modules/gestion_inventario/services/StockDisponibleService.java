package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.request.RestarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleRealPage;
import KuHub.modules.gestion_inventario.dtos.response.record.RestarDisponibleResult;
import KuHub.modules.gestion_inventario.dtos.response.record.StockDisponiblePage;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface StockDisponibleService {

    /** Registra una lista de sobrantes detectados en bodega de tránsito. */
    void registrar(List<RegistrarDisponibleDTO> items);

    /**
     * Retorna página paginada de stock disponible de Inventario, filtrable por categoría y por
     * nombre de producto (búsqueda). agrupado=true (default): una fila por producto con la
     * cantidad sumada de todos sus registros. agrupado=false: una fila por cada evento de
     * registro individual, con su usuario.
     */
    StockDisponiblePage listarInventario(int page, Integer idCategoria, boolean agrupado, String busqueda);

    /** Retorna página paginada de stock disponible de Bodega de Tránsito, filtrable por categoría y búsqueda (ver listarInventario). */
    StockDisponiblePage listarBodegaTransito(int page, Integer idCategoria, boolean agrupado, String busqueda);

    /** Retorna página paginada del disponible real por producto, filtrable por categoría y búsqueda de nombre. */
    DisponibleRealPage listarDisponibleReal(String busqueda, Integer idCategoria, int page);

    /** Suma el disponible activo por producto (solo los que tienen > 0), para un tipo dado. */
    Map<Integer, BigDecimal> consultarDisponiblePorProductos(List<Integer> idsProducto, String tipo);

    /** Descuenta disponible por producto (FIFO), aplicando sincronización ante procesos en paralelo. */
    RestarDisponibleResult restar(List<RestarDisponibleDTO> items);
}
