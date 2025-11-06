package KuHub.modules.inventario.repository;

import KuHub.modules.inventario.dtos.InventoryWithProductoResponseViewDTO;
import KuHub.modules.inventario.entity.Inventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventarioRepository extends JpaRepository<Inventario, Long> {

    @Query(value = "SELECT setval('inventario_id_inventario_seq', (SELECT COALESCE(MAX(id_inventario), 1) FROM inventario))", nativeQuery = true)
    Long sincronizarSecuencia();

    @Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo")
    List<Inventario> findInventoriesWithProductsActive(@Param("activo") Boolean activo);

    @Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo AND i.idInventario = :idInventario")
    Optional<Inventario> findByIdInventoryWithProductActive(
            @Param("idInventario") Long idInventario,
            @Param("activo") Boolean activo);


    @Query("SELECT COUNT(i) FROM Inventario i JOIN i.producto p " +
            "WHERE p.activo = true " +
            "AND (:nombreCategoria IS NULL " +
            "OR :nombreCategoria = '' " +
            "OR lower(p.nombreCategoria) = lower(:nombreCategoria))")
    Optional<Long> countAllInventarios(@Param("nombreCategoria") String nombreCategoria);


    @Query(value = "SELECT p.nombre_producto, " +
            "p.nombre_categoria, " +
            "i.stock, " +
            "p.unidad_medida, " +
            "i.stock_limit_min, " +
            "CASE " +
            "  WHEN i.stock = 0 THEN 'Sin stock' " +
            "  WHEN i.stock < i.stock_limit_min THEN 'Stock mínimo' " +
            "  WHEN i.stock >= i.stock_limit_min THEN 'Disponible' " +
            "END as estado_stock " +
            "FROM inventario i JOIN producto p ON p.id_producto = i.id_producto " +
            "WHERE p.activo = true " +
            "AND (:nombreCategoria IS NULL " +
            "OR :nombreCategoria = '' " +
            "OR LOWER(p.nombre_categoria) = LOWER(:nombreCategoria)) " + // ✅ Cerré el paréntesis aquí
            "LIMIT 10 OFFSET :startRow",
            nativeQuery = true)
    List<InventoryWithProductoResponseViewDTO> findInventariosForNumberPage(
            @Param("startRow") Long startRow,
            @Param("nombreCategoria") String nombreCategoria);
}
