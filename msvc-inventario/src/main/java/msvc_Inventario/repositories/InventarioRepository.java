package msvc_Inventario.repositories;

import msvc_Inventario.models.entities.Inventario;
import msvc_Inventario.models.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InventarioRepository extends JpaRepository<Inventario, Long> {
    Optional<Inventario> findByIdProducto(Long idProducto);
    Optional<Inventario> findById(Long idInventario);

    //Optional<Producto> findProductoByIdInventario(Long idInventario);
    //boolean existsByIdProducto(Long idProducto);
}
