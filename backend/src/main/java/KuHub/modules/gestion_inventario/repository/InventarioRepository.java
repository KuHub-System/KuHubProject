package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.dtos.InventoryWithProductResponseAnswerUpdateDTO;
import KuHub.modules.gestion_inventario.entity.Inventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventarioRepository extends JpaRepository<Inventario, Integer> {


    @Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo")
    List<Inventario> findInventoriesWithProductsActive(@Param("activo") Boolean activo);

    @Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo AND i.idInventario = :idInventario")
    Optional<Inventario> findByIdInventoryWithProductActive(
            @Param("idInventario") Integer idInventario,
            @Param("activo") Boolean activo);
    /**
    @Query(value = "SELECT i.id_inventario, " +
                    "p.id_producto, " +
                    "p.nombre_producto, " +
                    "p.descripcion_producto, " +
                    "p.nombre_categoria, " +
                    "p.unidad_medida, " +
                    "i.stock, " +
                    "i.stock_limit_min, " +
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
    List<InventoryWithProductResponseAnswerUpdateDTO> findAllActiveInventoryOrderedByName();*/

    boolean existsByIdInventario(Integer idInventario);

    //MODI V2 A BAJO, ARRIBA SE VA



    @Query(value = """
        SELECT 
            p.nombre_producto, 
            c.nombre_categoria, 
            i.stock, 
            i.stock_limit, 
            u.nombre_unidad,
            i.id_inventario, 
            p.id_producto, 
            c.id_categoria, 
            u.id_unidad
        FROM inventario i
        JOIN producto p ON p.id_producto = i.id_producto
        JOIN categoria c ON c.id_categoria = p.id_categoria
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE i.activo = TRUE 
          AND p.activo = TRUE
          AND (
              LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
              OR LOWER(p.descripcion_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
          )
        ORDER BY p.nombre_producto
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<Object[]> searchInventarioPage(
            @Param("searchTerm") String searchTerm,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    @Query(value = """
        SELECT COUNT(*)
        FROM inventario i
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE i.activo = TRUE 
          AND p.activo = TRUE
          AND (
              LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
              OR LOWER(p.descripcion_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
          )
        """, nativeQuery = true)
    long countSearchInventario(@Param("searchTerm") String searchTerm);

    @Query(value = """
        SELECT COUNT(*)
        FROM inventario i
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE
            i.activo = TRUE
            AND p.activo = TRUE
            AND (
                :useCategorias = FALSE
                OR p.id_categoria = ANY(CAST(:categoriasIds AS INTEGER[]))
            )
            AND (
                :useUnidades = FALSE
                OR p.id_unidad = ANY(CAST(:unidadesIds AS INTEGER[]))
            )
            AND (
                :soloStockBajo = FALSE
                OR i.stock <= i.stock_limit
            )
    """, nativeQuery = true)
    long countInventarioFiltered(
            @Param("useCategorias") boolean useCategorias,
            @Param("categoriasIds") Integer[] categoriasIds,
            @Param("useUnidades") boolean useUnidades,
            @Param("unidadesIds") Integer[] unidadesIds,
            @Param("soloStockBajo") boolean soloStockBajo
    );

    @Query(value = """
        SELECT
            p.nombre_producto,
            c.nombre_categoria,
            i.stock,
            i.stock_limit,
            u.nombre_unidad,
            i.id_inventario,
            p.id_producto,
            c.id_categoria,
            u.id_unidad
        FROM inventario i
        JOIN producto p ON p.id_producto = i.id_producto
        JOIN categoria c ON c.id_categoria = p.id_categoria
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE
            i.activo = TRUE
            AND p.activo = TRUE
            AND (
                :useCategorias = FALSE
                OR c.id_categoria = ANY(CAST(:categoriasIds AS INTEGER[]))
            )
            AND (
                :useUnidades = FALSE
                OR u.id_unidad = ANY(CAST(:unidadesIds AS INTEGER[]))
            )
            AND (
                :soloStockBajo = FALSE
                OR i.stock <= i.stock_limit
            )
        ORDER BY p.nombre_producto
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
    List<Object[]> findInventarioPage(
            @Param("useCategorias") boolean useCategorias,
            @Param("categoriasIds") Integer[] categoriasIds,
            @Param("useUnidades") boolean useUnidades,
            @Param("unidadesIds") Integer[] unidadesIds,
            @Param("soloStockBajo") boolean soloStockBajo,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    @Query(value = """
        SELECT
            json_build_object(
                'categorias',
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id_categoria,
                            'nombre', c.nombre_categoria
                        )
                    )
                    FROM categoria c
                    WHERE c.activo = TRUE
                ),
                'unidades',
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', u.id_unidad,
                            'nombre', u.nombre_unidad
                        )
                    )
                    FROM unidad_medida u
                    WHERE u.activo = TRUE
                )
            )
        """,
            nativeQuery = true
    )
    String getFiltersInventory();

}
