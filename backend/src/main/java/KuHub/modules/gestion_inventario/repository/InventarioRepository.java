package KuHub.modules.gestion_inventario.repository;

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

    /**Consulta para obtener un registro específico de inventario por su ID con todos sus detalles
     * Usada en caso estrategico especifico, cuanto al intentar actualizar un inventario, otro usuario actualizo
     * en paralelo retornando detalle para la sincronizacion*/
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

    /**Consulta para listar inventario por codigo de producto*/
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

    /**Consulta contar y usada para calcular total de paginas de inventario por codigo de producto*/
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

    /**Consulta para listar inventario por nombre o descripcion*/
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

    /**Consulta contar y usada para calcular total de paginas de inventario por nombre o descripcion*/
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

    /**Consulta para listar inventario con consulta dinamica segun filtros*/
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

    /**Consulta contar y usada para calcular total de paginas de inventario por consulta dinamica segun filtros*/
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

    /**Consulta para listar filtros de inventario*/
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

    /**
     * Incrementa el stock del inventario principal de forma atómica.
     * Se realiza directamente en DB para evitar procesos en paralelos prevenindo errores.
     */
    @Modifying
    @Transactional
    @Query(value = "UPDATE inventario SET stock = stock + :cantidad " +
            "WHERE id_inventario = :idInventario AND activo = true", nativeQuery = true)
    int addStockToInventory(@Param("idInventario") Integer idInventario,
                            @Param("cantidad") java.math.BigDecimal cantidad);

    /**Vereficaciones boleandas*/
    boolean existsInventarioByIdInventarioAndStock(Integer idInventario, BigDecimal stock);
    boolean existsInventarioByIdInventarioAndActivo(Integer idInventario, Boolean activo);
}
