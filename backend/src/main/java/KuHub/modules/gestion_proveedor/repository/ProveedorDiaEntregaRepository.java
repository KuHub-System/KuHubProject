package KuHub.modules.gestion_proveedor.repository;

import KuHub.modules.gestion_proveedor.entity.ProveedorDiaEntrega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ProveedorDiaEntregaRepository extends JpaRepository<ProveedorDiaEntrega, Integer> {

    // ── 1. Métodos JPA derivados ──

    /** Lista todos los días de entrega de un proveedor. */
    List<ProveedorDiaEntrega> findByProveedor_IdProveedor(Integer idProveedor);

    // ── 3. @Modifying + @Transactional ──

    /** Elimina todos los días de entrega de un proveedor (para reemplazo completo en update). */
    @Modifying
    @Transactional
    @Query("DELETE FROM ProveedorDiaEntrega d WHERE d.proveedor.idProveedor = :idProveedor")
    void deleteAllByIdProveedor(@Param("idProveedor") Integer idProveedor);
}
