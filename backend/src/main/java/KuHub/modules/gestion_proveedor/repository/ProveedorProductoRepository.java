package KuHub.modules.gestion_proveedor.repository;

import KuHub.modules.gestion_proveedor.entity.ProveedorProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProveedorProductoRepository extends JpaRepository<ProveedorProducto, Long> {

    // ── 1. Métodos JPA derivados ──

    /** Busca la relación activa entre un proveedor y un producto específico. */
    Optional<ProveedorProducto> findByProveedor_IdProveedorAndProducto_IdProducto(
            Integer idProveedor, Integer idProducto);

    /** Lista todas las relaciones (activas e inactivas) de un proveedor. */
    List<ProveedorProducto> findByProveedor_IdProveedor(Integer idProveedor);

    /** Verifica si ya existe una relación activa entre proveedor y producto. */
    boolean existsByProveedor_IdProveedorAndProducto_IdProductoAndActivoTrue(
            Integer idProveedor, Integer idProducto);

    /** Cuenta cuántos productos activos tiene asignados un proveedor. */
    long countByProveedor_IdProveedorAndActivoTrue(Integer idProveedor);

    // ── 3. @Modifying + @Transactional ──

    /** Desactiva (soft-delete) la relación entre un proveedor y un producto. */
    @Modifying
    @Query("UPDATE ProveedorProducto pp SET pp.activo = false WHERE pp.proveedor.idProveedor = :idProveedor AND pp.producto.idProducto = :idProducto")
    int softDeleteByProveedorAndProducto(
            @Param("idProveedor") Integer idProveedor,
            @Param("idProducto") Integer idProducto);
}
