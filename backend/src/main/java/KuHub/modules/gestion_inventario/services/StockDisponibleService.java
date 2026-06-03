package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.request.RestarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.RestarDisponibleResult;
import KuHub.modules.gestion_inventario.dtos.response.record.StockDisponiblePage;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface StockDisponibleService {

    /** Registra una lista de sobrantes detectados en bodega de tránsito. */
    void registrar(List<RegistrarDisponibleDTO> items);

    /** Retorna página paginada de stock disponible filtrada por tipo (INVENTARIO | BODEGA_TRANSITO). */
    StockDisponiblePage listar(String tipo, int page);

    /** Suma el disponible activo por producto (solo los que tienen > 0), para un tipo dado. */
    Map<Integer, BigDecimal> consultarDisponiblePorProductos(List<Integer> idsProducto, String tipo);

    /** Descuenta disponible por producto (FIFO), aplicando sincronización ante procesos en paralelo. */
    RestarDisponibleResult restar(List<RestarDisponibleDTO> items);
}
