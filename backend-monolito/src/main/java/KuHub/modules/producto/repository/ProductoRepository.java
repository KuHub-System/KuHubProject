package KuHub.modules.producto.repository;

import KuHub.modules.producto.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {


    Optional<Producto> findByNombreProducto(String nombreProducto);
    Optional<Producto> findByIdProductoAndActivo(Long idProducto, Boolean activo);
    Optional<Producto> findByNombreProductoAndActivo(String nombreProducto, Boolean activo);
    List<Producto> findByActivo(Boolean activo);
    boolean existsByNombreProducto(String nombreProducto);
    boolean existsBycodProductoAndActivo(String codProducto, Boolean activo);
    //List<Producto> findByCategoriaIdCategoria(Long idCategoria);
    //boolean existsByCategoriaIdCategoria(Long idCategoria);
}
