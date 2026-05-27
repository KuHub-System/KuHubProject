package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehouseProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehousesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.WarehousesPage;

import java.util.List;

public interface BodegaTransitoService {

    WarehousesPage searchTransitWarehousePage(SearchDTO request);
    WarehousesPage  searchWarehouseByCodProduct(SearchDTO request);
    WarehousesPage findPagedTransitWarehouse(FilterInventoryPageDTO filter);
    Object updateTransitWarehouseWithProduct(WarehouseWithProductUpdateDTO request);
    WarehousesPage.WarehouseItem findSingleWarehouseById(Integer idBodegaTransito);
    WarehousesPage.WarehouseItem createBodegaConProducto(InventoryWithProductCreateDTO request);

    BulkWarehousesPage findByMassiveBodegaPaginated(SearchDTO request);
    BulkWarehouseProcess processBulkWarehouseUpdate(List<BulkWarehouseProcess.ItemRequest> requests);

}
