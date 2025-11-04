package KuHub.repository;

import KuHub.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {


    Optional<Producto> findByNombreProducto(String nombreProducto);
    boolean existsByNombreProducto(String nombreProducto);
    //List<Producto> findByCategoriaIdCategoria(Long idCategoria);
    //boolean existsByCategoriaIdCategoria(Long idCategoria);
}
