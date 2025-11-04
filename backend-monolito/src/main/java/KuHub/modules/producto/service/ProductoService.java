package KuHub.modules.producto.service;


import KuHub.modules.producto.dtos.ProductoUpdateRequest;
import KuHub.modules.producto.entity.Producto;

import java.util.List;

public interface ProductoService {
    List<Producto> findAll();
    List<Producto> findByActivo(Boolean activo);


    Producto findById(Long id);
    Producto findByIdProductoAndActivo(Long id, Boolean activo);

    Producto findByNombreProducto(String nombreProducto); //ultilizado en service no en controller
    Producto findByNombreProductoAndActivo(String nombreProducto, Boolean activo);

    Producto save (Producto producto);

    Producto updateByName(String nombreProductoActual , ProductoUpdateRequest productoRequest);
    Producto updateById(Long id, ProductoUpdateRequest productoRequest);
    void deleteById(Long id);
    void deleteByName(String nombreProducto);
    //List<Producto> findByIds(List<Long> ids);
    //Categoria findCategoriaByIdProducto(Long idProducto);
    //Categoria findCategoriaByNombreProducto(String nombreProducto);
    //List<Producto> findByCategoriaIdCategoria(Long idCategoria);
}
