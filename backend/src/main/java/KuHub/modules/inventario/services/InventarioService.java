package KuHub.modules.inventario.services;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateDTO;
import KuHub.modules.inventario.dtos.InventoryWithProductResponseAnswerUpdateDTO;
import KuHub.modules.inventario.entity.Inventario;

import java.util.List;

public interface InventarioService {
    //InventarioDTO save(InventarioDTO dto);

    List<Inventario> findAll();
    List<Inventario> findInventoriesWithProductsActive(Boolean activo);
    Inventario findById(Integer id);
    Inventario findByIdInventoryWithProductActive(Integer idInventario,Boolean activo);
    List<InventoryWithProductResponseAnswerUpdateDTO> findAllActiveInventoryOrderedByName();
    InventoryWithProductResponseAnswerUpdateDTO updateInventoryWithProduct(InventoryWithProductResponseAnswerUpdateDTO inventarioRequest);
    InventoryWithProductCreateDTO save (InventoryWithProductCreateDTO inventarioRequest);
    //Inventario getInventarioByIdProducto(Long idProducto);
    //Producto findProductoByIdInventario(Long idInventario);
    void updateActiveValueProductFalse(Integer id);
    //InventarioDTO update(Long id,InventarioDTO dto);
    //void updateTotalInventario(Long id, float adjustmentAmount);
}
