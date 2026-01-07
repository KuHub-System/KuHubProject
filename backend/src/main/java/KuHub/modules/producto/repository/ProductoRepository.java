package KuHub.modules.producto.repository;

import KuHub.modules.producto.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Integer> {
    //hay un problema de desincronizacion que necesita crear este metodo, para no estar recreando en la bbdd se engatilla aca
    @Query(value = "SELECT setval('producto_id_producto_seq', (SELECT COALESCE(MAX(id_producto), 1) FROM producto))", nativeQuery = true)
    Integer sincronizarSecuencia();

    @Query("SELECT DISTINCT (p.nombreCategoria) FROM Producto p WHERE p.activo = true")
    List<String> findDistinctCategoriaByActivoTrue();

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

    //List<Producto> findByCategoriaIdCategoria(Long idCategoria);
    //boolean existsByCategoriaIdCategoria(Long idCategoria);
}
