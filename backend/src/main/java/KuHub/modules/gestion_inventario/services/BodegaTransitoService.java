package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.WarehousesPage;

public interface BodegaTransitoService {

    WarehousesPage searchTransitWarehousePage(SearchDTO request);
    WarehousesPage  searchWarehouseByCodProduct(SearchDTO request);
    WarehousesPage findPagedTransitWarehouse(FilterInventoryPageDTO filter);
    Object updateTransitWarehouseWithProduct(WarehouseWithProductUpdateDTO request);
    WarehousesPage.WarehouseItem findSingleWarehouseById(Integer idBodegaTransito);

}
