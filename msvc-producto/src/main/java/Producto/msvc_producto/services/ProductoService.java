package Producto.msvc_producto.services;

import Producto.msvc_producto.dtos.ProductoUpdateRequest;
import Producto.msvc_producto.models.entity.Categoria;
import Producto.msvc_producto.models.entity.Producto;

import java.util.List;

public interface ProductoService {
    List<Producto> findAll();
    Producto findByNombreProducto(String nombreProducto); //ultilizado en service no en controller
    Producto save (Producto producto);
    Producto findById(Long id);
    Producto updateByName(String nombreProductoActual , ProductoUpdateRequest productoRequest);
    Producto updateById(Long id, ProductoUpdateRequest productoRequest);
    void deleteById(Long id);
    void deleteByName(String nombreProducto);
    List<Producto> findByIds(List<Long> ids);
    Categoria findCategoriaByIdProducto(Long idProducto);
    Categoria findCategoriaByNombreProducto(String nombreProducto);
    List<Producto> findByCategoriaIdCategoria(Long idCategoria);
}
