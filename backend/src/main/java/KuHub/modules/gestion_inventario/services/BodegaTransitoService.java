package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.ConfirmarNuevosExcelDTO;
import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehouseProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehousesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.SincronizarExcelResultado;
import KuHub.modules.gestion_inventario.dtos.response.record.WarehousesPage;
import org.springframework.web.multipart.MultipartFile;

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

    List<WarehousesPage.WarehouseItem> inicializarDesdeAbastecimiento(List<Integer> idsProducto);
    List<WarehousesPage.WarehouseItem> findBodegaByInventarioIds(List<Integer> inventarioIds);

    SincronizarExcelResultado sincronizarBodegaDesdeExcel(
            MultipartFile archivo, String nombreHoja, Short idCategoria, int filaInicio, int filaFin);
    int confirmarNuevosBodegaExcel(List<ConfirmarNuevosExcelDTO.ItemNuevo> items);

}
