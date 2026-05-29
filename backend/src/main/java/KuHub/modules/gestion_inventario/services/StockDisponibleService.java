package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.StockDisponiblePage;

import java.util.List;

public interface StockDisponibleService {

    /** Registra una lista de sobrantes detectados en bodega de tránsito. */
    void registrar(List<RegistrarDisponibleDTO> items);

    /** Retorna página paginada de stock disponible filtrada por tipo (INVENTARIO | BODEGA_TRANSITO). */
    StockDisponiblePage listar(String tipo, int page);
}
