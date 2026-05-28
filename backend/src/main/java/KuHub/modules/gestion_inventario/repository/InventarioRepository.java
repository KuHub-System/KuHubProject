package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.dtos.response.proyeccion.ProductInventoryBulkView;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoriesPage;
import KuHub.modules.gestion_inventario.entity.Inventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventarioRepository extends JpaRepository<Inventario, Integer> {

    /** Carga múltiples inventarios activos con su producto asociado por lista de IDs. */
    @Query("SELECT i FROM Inventario i JOIN FETCH i.producto WHERE i.idInventario IN :ids AND i.activo = true")
    List<Inventario> findAllByIdsWithProductsActive(@Param("ids") List<Integer> ids);

    /** Busca el inventario de un producto por su ID de producto (relación OneToOne). */
    Optional<Inventario> findByProducto_IdProducto(Integer idProducto);

    /** Busca un inventario activo con su producto por ID. */
    @Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo AND i.idInventario = :idInventario")
    Optional<Inventario> findByIdInventoryWithProductActive(
            @Param("idInventario") Integer idInventario,
            @Param("activo") Boolean activo);

    /**
     * Retorna el detalle completo de un inventario específico mapeado por índice de columna.
     * Usado para sincronizar la vista del frontend cuando otro usuario actualizó en paralelo.
     */
    @Query(value = """
    SELECT 
        p.nombre_producto,      -- [0]
        p.cod_producto,         -- [1]
        p.descripcion_producto, -- [2]
        c.nombre_categoria,     -- [3]
        i.stock,                -- [4]
        i.stock_limit,          -- [5]
        u.nombre_unidad,        -- [6]
        u.es_fraccionario,      -- [7]
        i.id_inventario,        -- [8]
        p.id_producto,          -- [9]
        c.id_categoria,         -- [10]
        u.id_unidad             -- [11]
    FROM inventario i
    JOIN producto p ON p.id_producto = i.id_producto
    JOIN categoria c ON c.id_categoria = p.id_categoria
    JOIN unidad_medida u ON u.id_unidad = p.id_unidad
    WHERE i.id_inventario = :idInventario 
      AND i.activo = TRUE 
      AND p.activo = TRUE
""", nativeQuery = true)
    List<Object[]> findByIdToInventoryPage(@Param("idInventario") Integer idInventario);


    /** Lista paginada de inventario filtrada por código de producto. */
    @Query(value = """
        SELECT 
            p.nombre_producto,
            p.cod_producto,
            p.descripcion_producto,
            c.nombre_categoria, 
            i.stock, 
            i.stock_limit, 
            u.nombre_unidad,
            u.es_fraccionario,
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
          AND LOWER(p.cod_producto) LIKE LOWER(CONCAT('%', :codProducto, '%'))
        ORDER BY p.nombre_producto
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
    List<Object[]> searchInventarioByCodProductPage(
            @Param("codProducto") String codProducto,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /** Cuenta el total de inventarios filtrados por código de producto para calcular la paginación. */
    @Query(value = """
        SELECT COUNT(*)
        FROM inventario i
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE i.activo = TRUE
          AND p.activo = TRUE
          AND LOWER(p.cod_producto) LIKE LOWER(CONCAT('%', :codProducto, '%'))
    """, nativeQuery = true)
    long countSearchInventarioByCodProduct(
            @Param("codProducto") String codProducto
    );

    /** Lista paginada de inventario filtrada por nombre o descripción del producto. */
    @Query(value = """
        SELECT 
            p.nombre_producto,
            p.cod_producto,
            p.descripcion_producto,
            c.nombre_categoria, 
            i.stock, 
            i.stock_limit, 
            u.nombre_unidad,
            u.es_fraccionario,
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
    List<Object[]> searchInventoryPage(
            @Param("searchTerm") String searchTerm,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /** Cuenta el total de inventarios filtrados por nombre o descripción para calcular la paginación. */
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
    long countSearchInventory(@Param("searchTerm") String searchTerm);


    /** Lista paginada de inventario con filtros dinámicos: categorías, unidades, stock bajo y agotados. */
    @Query(value = """
        SELECT
            p.nombre_producto,
            p.cod_producto,
            p.descripcion_producto,
            c.nombre_categoria,
            i.stock,
            i.stock_limit,
            u.nombre_unidad,
            u.es_fraccionario,
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
            AND (
                :ocultarAgotados = FALSE
                OR i.stock > 0
                    )
            ORDER BY
                    CASE WHEN :isAsc = TRUE THEN p.nombre_producto END ASC,
                    CASE WHEN :isAsc = FALSE THEN p.nombre_producto END DESC
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
    List<Object[]> findInventoryPage(
            @Param("useCategorias") boolean useCategorias,
            @Param("categoriasIds") Integer[] categoriasIds,
            @Param("useUnidades") boolean useUnidades,
            @Param("unidadesIds") Integer[] unidadesIds,
            @Param("soloStockBajo") boolean soloStockBajo,
            @Param("ocultarAgotados") boolean ocultarAgotados,
            @Param("isAsc") boolean isAsc,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /** Cuenta el total de inventarios según filtros dinámicos para calcular la paginación. */
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
            AND (
                        :ocultarAgotados = FALSE
                        OR i.stock > 0
                    )
    """, nativeQuery = true)
    long countInventarioFiltered(
            @Param("useCategorias") boolean useCategorias,
            @Param("categoriasIds") Integer[] categoriasIds,
            @Param("useUnidades") boolean useUnidades,
            @Param("unidadesIds") Integer[] unidadesIds,
            @Param("soloStockBajo") boolean soloStockBajo,
            @Param("ocultarAgotados") boolean ocultarAgotados
    );

    /** Retorna en JSON los filtros disponibles de categorías y unidades de medida activas. */
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


    /** Cuenta el total de inventarios para control masivo, filtrando por nombre o código si se proporciona un término. */
    @Query(value = """
        SELECT COUNT(*) 
        FROM inventario i 
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE i.activo = true 
          AND (
              :searchTerm = '' 
              OR LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
              OR LOWER(p.cod_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
          )
""", nativeQuery = true)
    long countBulkInventoryFiltered(@Param("searchTerm") String searchTerm);

    /** Lista paginada de inventarios con stock formateado para el modal de control masivo. */
    @Query(value = """
        SELECT 
            p.nombre_producto AS nombreProducto, 
            'Stock: ' || trim(trailing '.' from to_char(i.stock, 'FM9999990.999')) || ' ' || u.nombre_unidad AS detalles,
            i.stock AS stock, 
            u.es_fraccionario AS esFraccionario,
            i.id_inventario AS idInventario, 
            p.id_producto AS idProducto
        FROM inventario i
        JOIN producto p ON i.id_producto = p.id_producto 
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad 
        WHERE i.activo = true
          AND (
              :searchTerm = '' 
              OR LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
              OR LOWER(p.cod_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
          )
        ORDER BY p.nombre_producto
        LIMIT :limit OFFSET :offset
""", nativeQuery = true)
    List<BulkInventoriesPage.ProductInventoryBulkView> bulkProductInventoryListingPage(
            @Param("searchTerm") String searchTerm,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /** Retorna un inventario único con formato masivo. Usado para sincronización en conflictos de stock. */
    @Query(value = """
        SELECT 
            p.nombre_producto AS nombreProducto, 
            'Stock: ' || trim(trailing '.' from to_char(i.stock, 'FM9999990.999')) || ' ' || u.nombre_unidad AS detalles,
            i.stock AS stock, 
            u.es_fraccionario AS esFraccionario,
            i.id_inventario AS idInventario, 
            p.id_producto AS idProducto
        FROM inventario i
        JOIN producto p ON i.id_producto = p.id_producto 
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad 
        WHERE i.id_inventario = :idInventario AND i.activo = true
    """, nativeQuery = true)
    Optional<ProductInventoryBulkView> findBulkInventoryById(@Param("idInventario") Integer idInventario);


    // ─── MODIFICACIONES ──────────────────────────────────────────────────────────

    /** Incrementa el stock del inventario de forma atómica directamente en BD para evitar conflictos en paralelo. */
    @Modifying
    @Transactional
    @Query(value = "UPDATE inventario SET stock = stock + :cantidad " +
            "WHERE id_inventario = :idInventario AND activo = true", nativeQuery = true)
    int addStockToInventory(@Param("idInventario") Integer idInventario,
                            @Param("cantidad") java.math.BigDecimal cantidad);

    // ─── BOOLEANOS ───────────────────────────────────────────────────────────────

    /** Verifica si existe un inventario con el ID y stock indicados. */
    boolean existsInventarioByIdInventarioAndStock(Integer idInventario, BigDecimal stock);
    /** Verifica si existe un inventario con el ID y estado activo indicado. */
    boolean existsInventarioByIdInventarioAndActivo(Integer idInventario, Boolean activo);

    /** Busca un inventario activo por el ID de su producto asociado. */
    Optional<Inventario> findByProducto_IdProductoAndActivoTrue(Integer idProducto);
}
