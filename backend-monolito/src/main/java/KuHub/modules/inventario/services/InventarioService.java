package KuHub.modules.inventario.services;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;
import KuHub.modules.inventario.entity.Inventario;

import java.util.List;

public interface InventarioService {
    void sincronizarSecuenciaInventario();
    //InventarioDTO save(InventarioDTO dto);

    List<Inventario> findAll();
    List<Inventario> findInventoriesWithProductsActive(Boolean activo);
    Inventario findById(Long id);
    Inventario findByIdInventoryWithProductActive(Long idInventario,Boolean activo);
    Long countInventoryForPaginationRows(String nombreCategoria);
    Inventario save (InventoryWithProductCreateRequestDTO inventarioRequest);

    //Inventario getInventarioByIdProducto(Long idProducto);
    //Producto findProductoByIdInventario(Long idInventario);
    void deleteById(Long id);
    //InventarioDTO update(Long id,InventarioDTO dto);
    //void updateTotalInventario(Long id, float adjustmentAmount);
}
