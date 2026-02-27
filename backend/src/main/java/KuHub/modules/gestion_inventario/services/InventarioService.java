package KuHub.modules.gestion_inventario.services;

import KuHub.modules.gestion_inventario.dtos.request.dto.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.dto.InventoryWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoriesPageDTO;
import KuHub.modules.gestion_inventario.dtos.response.InventoryFiltersDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;

public interface InventarioService {
    Inventario findById(Integer id);
    InventoriesPageDTO searchInventory(String searchTerm, Integer pageRequested);
    InventoriesPageDTO searchInventoryByCodProducto(String codProducto, Integer pageRequested);
    InventoriesPageDTO getPagedInventory(FilterInventoryPageDTO filter);
    InventoryFiltersDTO getFiltersInventory();
    boolean saveInventoryWithProduct (InventoryWithProductCreateDTO inventarioRequest);
    boolean updateInventoryWithProduct (InventoryWithProductUpdateDTO request);
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
