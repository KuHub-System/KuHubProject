package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.WarehousesPageDTO;

public interface BodegaTransitoService {

    WarehousesPageDTO searchTransitWarehousePage(String searchTerm, Integer pageRequested);
    WarehousesPageDTO searchWarehouseByCodProduct(String codProducto, Integer pageRequested);
    WarehousesPageDTO getPagedTransitWarehouse(FilterInventoryPageDTO filter);
}
