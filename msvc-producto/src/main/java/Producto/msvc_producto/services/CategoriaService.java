package Producto.msvc_producto.services;

import Producto.msvc_producto.models.entity.Categoria;
import Producto.msvc_producto.models.entity.Producto;

import java.util.List;

public interface CategoriaService {
    Categoria findById(Long idCategoria);
    List<Categoria> findAll();
    Categoria save(Categoria categoria);
    void delete(Long idCategoria);
    Categoria updateNombreCategoria(Categoria categoria);

}
