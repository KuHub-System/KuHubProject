package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoriesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoryProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.InventoriesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.InventoryFilters;
import KuHub.modules.gestion_inventario.entity.Inventario;

import java.util.List;

public interface InventarioService {
    Inventario findById(Integer id);
    InventoriesPage searchInventory(SearchDTO request);
    InventoriesPage  searchInventoryByCodProducto(SearchDTO request);
    InventoriesPage findPagedInventory(FilterInventoryPageDTO filter) ;
    InventoryFilters findFiltersInventory() ;
    BulkInventoriesPage findByMassiveInventoryPaginated(SearchDTO request);
    boolean saveInventoryWithProduct (InventoryWithProductCreateDTO inventarioRequest);
    Object updateInventoryWithProduct (InventoryWithProductUpdateDTO request);
    BulkInventoryProcess processBulkInventoryUpdate(List<BulkInventoryProcess.ItemRequest> requests);
    boolean softDeleteByInventoryWithProduct(Integer idInventario);


}
