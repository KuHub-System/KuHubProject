package KuHub.modules.inventario.services;

import KuHub.modules.inventario.dtos.InventoryWithProductCreateRequestDTO;
import KuHub.modules.inventario.dtos.InventoryWithProductoResponseViewDTO;
import KuHub.modules.inventario.entity.Inventario;

import java.util.List;

public interface InventarioService {
    void syncSeq();
    //InventarioDTO save(InventarioDTO dto);

    List<Inventario> findAll();
    List<Inventario> findInventoriesWithProductsActive(Boolean activo);
    List<InventoryWithProductoResponseViewDTO> findInventariosForNumberPageByFilterCategoria(Long startRow, String nombreCategoria);
    List<InventoryWithProductoResponseViewDTO> findInventariosForNumberPageSeachSimilarName(
            Long cantidadesPaginasCalculada,String buscarProductoNombreSimilares);
    Inventario findById(Long id);
    Inventario findByIdInventoryWithProductActive(Long idInventario,Boolean activo);
    Long countInventoryForPaginationRowsByCategoria(String nombreCategoria);
    Long countInventoryForPaginationRowsSeachSimilarName(String buscarProductoNombreSimilares);
    Long calculaterCountPages(Long cantidadInventarios);
    Long calculaterStartRow(Long numeroPagina);
    Inventario save (InventoryWithProductCreateRequestDTO inventarioRequest);

    //Inventario getInventarioByIdProducto(Long idProducto);
    //Producto findProductoByIdInventario(Long idInventario);
    void deleteById(Long id);
    //InventarioDTO update(Long id,InventarioDTO dto);
    //void updateTotalInventario(Long id, float adjustmentAmount);
}
