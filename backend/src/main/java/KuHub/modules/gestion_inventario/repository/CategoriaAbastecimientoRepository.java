package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.CategoriaAbastecimiento;
import KuHub.modules.gestion_inventario.entity.CategoriaAbastecimientoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface CategoriaAbastecimientoRepository
        extends JpaRepository<CategoriaAbastecimiento, CategoriaAbastecimientoId> {

    /**
     * Retorna todas las categorías activas con sus flags de abastecimiento (Patrón B).
     * Cada fila incluye: idCategoria, nombreCategoria, inventario (bool), bodegaTransito (bool).
     */
    @Query(value = """
        SELECT COALESCE(
            json_agg(
                json_build_object(
                    'idCategoria',     c.id_categoria,
                    'nombreCategoria', c.nombre_categoria,
                    'inventario',      EXISTS(
                        SELECT 1 FROM categoria_abastecimiento ca
                        WHERE ca.id_categoria        = c.id_categoria
                          AND ca.tipo_abastecimiento = 'INVENTARIO'
                    ),
                    'bodegaTransito',  EXISTS(
                        SELECT 1 FROM categoria_abastecimiento ca
                        WHERE ca.id_categoria        = c.id_categoria
                          AND ca.tipo_abastecimiento = 'BODEGA_TRANSITO'
                    )
                )
                ORDER BY c.nombre_categoria ASC
            ),
        '[]'::json)
        FROM categoria c
        WHERE c.activo = TRUE
    """, nativeQuery = true)
    String findAllCategoriaConfigJson();

    /**
     * Inserta una fila con CAST explícito al ENUM tipo_abastecimiento.
     * Evita que JDBC envíe el parámetro como text sin tipo, lo que rompe el ENUM incluso con cast implícito.
     */
    @Modifying
    @Transactional
    @Query(value = "INSERT INTO categoria_abastecimiento (id_categoria, tipo_abastecimiento) VALUES (:idCategoria, CAST(:tipo AS tipo_abastecimiento))",
           nativeQuery = true)
    void insertCategoriaAbastecimiento(@Param("idCategoria") Short idCategoria,
                                       @Param("tipo") String tipo);

    /** Elimina todas las filas de configuración para una categoría específica. */
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM categoria_abastecimiento WHERE id_categoria = :idCategoria",
           nativeQuery = true)
    void deleteByIdCategoriaCustom(@Param("idCategoria") Short idCategoria);
}
