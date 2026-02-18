package KuHub.modules.gestion_inventario.services;


import KuHub.modules.gestion_inventario.dtos.proyeccion.ProductRecipeView;
import KuHub.modules.gestion_inventario.entity.Producto;

import java.util.Collection;
import java.util.List;

public interface ProductoService {

    List<Producto> findAll();
    List<Producto> findByActivo(Boolean activo);

    List<Producto> findAllByIdInAndActivoTrue(Collection<Integer> ids);

    //List<ProductRecipeView> findAllActiveForRecipe();

    Boolean existProductByName (String nombreProducto);
    Boolean existProductoById (Integer id);

    Producto findById(Integer id);
    Producto findByIdProductoAndActivoTrue(Integer id_producto);

    Producto findByNombreProducto(String nombreProducto); //ultilizado en service no en controller
    Producto findByNombreProductoAndActivo(String nombreProducto, Boolean activo);



    Producto save (Producto producto);

    void deleteById(Integer id);
    void deleteByName(String nombreProducto);
}
