package KuHub.modules.producto.service;


import KuHub.modules.producto.dtos.ProductoUpdateRequest;
import KuHub.modules.producto.entity.Producto;

import java.util.List;

public interface ProductoService {

    List<Producto> findAll();
    List<Producto> findByActivo(Boolean activo);

    Boolean existProductByName (String nombreProducto);
    Boolean existProductoById (Integer id);

    Producto findById(Integer id);
    Producto findByIdProductoAndActivoTrue(Integer id_producto);

    Producto findByNombreProducto(String nombreProducto); //ultilizado en service no en controller
    Producto findByNombreProductoAndActivo(String nombreProducto, Boolean activo);

    List<String> findDistinctCategoriaAndActivoTrue();
    List<String> findDistinctUnidadMedidaByActivoTrue();


    Producto save (Producto producto);

    Producto updateByName(String nombreProductoActual , ProductoUpdateRequest productoRequest);
    Producto updateById(Integer id, ProductoUpdateRequest productoRequest);

    void deleteById(Integer id);
    void deleteByName(String nombreProducto);
    //List<Producto> findByIds(List<Long> ids);
    //Categoria findCategoriaByIdProducto(Long idProducto);
    //Categoria findCategoriaByNombreProducto(String nombreProducto);
    //List<Producto> findByCategoriaIdCategoria(Long idCategoria);
}
