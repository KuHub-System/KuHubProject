package KuHub.modules.inventario.repository;

import KuHub.modules.inventario.dtos.InventoryWithProductoResponseDTO;
import KuHub.modules.inventario.entity.Inventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventarioRepository extends JpaRepository<Inventario, Integer> {

    @Query(value = "SELECT setval('inventario_id_inventario_seq', (SELECT COALESCE(MAX(id_inventario), 1) FROM inventario))", nativeQuery = true)
    Integer syncSeq();

    @Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo")
    List<Inventario> findInventoriesWithProductsActive(@Param("activo") Boolean activo);

    @Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo AND i.idInventario = :idInventario")
    Optional<Inventario> findByIdInventoryWithProductActive(
            @Param("idInventario") Integer idInventario,
            @Param("activo") Boolean activo);

    @Query(value = "SELECT i.id_inventario, " +
                    "p.id_producto, " +
                    "p.nombre_producto, " +
                    "p.nombre_categoria, " +
                    "i.stock, " +
                    "i.stock_limit_min, " +
                    "p.unidad_medida, " +
                    "CASE " +
                    "    WHEN i.stock = 0 THEN 'Sin stock' " +
                    "    WHEN i.stock < i.stock_limit_min THEN 'Stock mínimo' " +
                    "    WHEN i.stock >= i.stock_limit_min THEN 'Disponible' " +
                    "END as estado_stock " +
                    "FROM inventario i " +
                    "JOIN producto p ON i.id_producto = p.id_producto " +
                    "WHERE p.activo = TRUE " +
                    "ORDER BY p.nombre_producto",
                    nativeQuery = true)
    List<InventoryWithProductoResponseDTO> findAllActiveInventoryOrderedByName();




}
