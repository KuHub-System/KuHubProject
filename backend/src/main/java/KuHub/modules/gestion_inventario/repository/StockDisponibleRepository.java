package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.StockDisponible;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockDisponibleRepository extends JpaRepository<StockDisponible, Integer> {

    /** Cuenta los registros activos por tipo para calcular paginación. */
    @Query(value = """
            SELECT COUNT(sd.id_stock_disponible)
            FROM stock_disponible sd
            WHERE sd.tipo_disponible = :tipo AND sd.activo = TRUE
            """, nativeQuery = true)
    long countByTipoAndActivo(@Param("tipo") String tipo);

    /**
     * Retorna página de stock disponible con datos denormalizados del producto.
     * [0] nombre_producto
     * [1] nombre_categoria
     * [2] cantidad (stock disponible)
     * [3] nombre_unidad
     * [4] abreviatura
     * [5] fecha_registro
     * [6] tipo_disponible
     */
    @Query(value = """
            SELECT
                p.nombre_producto,       -- [0]
                c.nombre_categoria,      -- [1]
                sd.cantidad,             -- [2]
                um.nombre_unidad,        -- [3]
                um.abreviatura,          -- [4]
                CAST(sd.fecha_registro AS VARCHAR), -- [5]
                sd.tipo_disponible       -- [6]
            FROM stock_disponible sd
            JOIN producto p  ON p.id_producto  = sd.id_producto
            JOIN categoria c ON c.id_categoria = p.id_categoria
            JOIN unidad_medida um ON um.id_unidad = p.id_unidad
            WHERE sd.tipo_disponible = :tipo AND sd.activo = TRUE
            ORDER BY sd.fecha_registro DESC, p.nombre_producto ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Object[]> findByTipoPaginado(
            @Param("tipo") String tipo,
            @Param("limit") int limit,
            @Param("offset") int offset);
}
