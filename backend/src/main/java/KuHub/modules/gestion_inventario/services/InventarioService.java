package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.*;
import KuHub.modules.gestion_inventario.dtos.response.BulkInventoriesPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoriesPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryFiltersDTO;
import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductInventoryBulkView;
import KuHub.modules.gestion_inventario.entity.Inventario;

import java.util.List;

public interface InventarioService {
    Inventario findById(Integer id);
    InventoriesPageDTO searchInventory(String searchTerm, Integer pageRequested);
    InventoriesPageDTO searchInventoryByCodProducto(String codProducto, Integer pageRequested);
    InventoriesPageDTO getPagedInventory(FilterInventoryPageDTO filter);
    InventoryFiltersDTO getFiltersInventory();
    BulkInventoriesPageDTO getBulkInventoryPaginated(BulkInventoryRequestDTO request);
    Object validateBulkInventoryStockBeforeUpdating(ValidateInventoryStockDTO request);
    Object validateStockBeforeUpdating(ValidateInventoryStockDTO request);
    boolean saveInventoryWithProduct (InventoryWithProductCreateDTO inventarioRequest);
    boolean updateInventoryWithProduct (InventoryWithProductUpdateDTO request);
    boolean updateBulkInventoryStock(BulkInventoryUpdateDTO request);
    boolean softDeleteByInventoryWithProduct(Integer idInventario);






    //InventarioDTO save(InventarioDTO dto);
    /**
    List<Inventario> findAll();
    List<Inventario> findInventoriesWithProductsActive(Boolean activo);

    Inventario findByIdInventoryWithProductActive(Integer idInventario,Boolean activo);
    List<InventoryWithProductResponseAnswerUpdateDTO> findAllActiveInventoryOrderedByName();
    InventoryWithProductResponseAnswerUpdateDTO updateInventoryWithProduct(InventoryWithProductResponseAnswerUpdateDTO inventarioRequest);
    InventoryWithProductCreateDTO save (InventoryWithProductCreateDTO inventarioRequest);
    boolean existInventory (Integer id);
    //Producto findProductoByIdInventario(Long idInventario);
    void updateActiveValueProductFalse(Integer id);
    //InventarioDTO update(Long id,InventarioDTO dto);
    //void updateTotalInventario(Long id, float adjustmentAmount);
     */
}
