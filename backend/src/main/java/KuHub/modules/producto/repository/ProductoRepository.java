package KuHub.modules.producto.repository;

import KuHub.modules.producto.dtos.proyeccion.ProductRecipeView;
import KuHub.modules.producto.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Integer> {

    @Query("SELECT DISTINCT (p.nombreCategoria) FROM Producto p WHERE p.activo = true")
    List<String> findDistinctCategoriaByActivoTrue();

    @Query("""
        SELECT p.idProducto AS idProducto, 
               p.nombreProducto AS nombreProducto, 
               p.nombreCategoria AS nombreCategoria, 
               p.unidadMedida AS unidadMedida 
        FROM Producto p 
        WHERE p.activo = true 
        ORDER BY p.nombreProducto ASC
    """)
    List<ProductRecipeView> findAllActiveForRecipe();

    @Query("SELECT DISTINCT p.unidadMedida FROM Producto p WHERE p.activo = true")
    List<String> findDistinctUnidadMedidaByActivoTrue();

    Optional<Producto> findByNombreProducto(String nombreProducto);
    Optional<Producto> findByIdProductoAndActivoTrue(Integer id_producto);
    Optional<Producto> findByNombreProductoAndActivo(String nombreProducto, Boolean activo);


    List<Producto> findByActivo(Boolean activo);
    boolean existsByNombreProductoAndIdProductoIsNot(String nombreProducto, Integer idProducto);
    boolean existsByNombreProducto(String nombreProducto);
    boolean existsBycodProductoAndActivo(String codProducto, Boolean activo);
    boolean existsByIdProducto(Integer idProducto);

    // Cambia "Id" por "IdProducto"
    List<Producto> findAllByIdProductoInAndActivoTrue(Collection<Integer> ids);;
    //List<Producto> findByCategoriaIdCategoria(Long idCategoria);
    //boolean existsByCategoriaIdCategoria(Long idCategoria);
}
