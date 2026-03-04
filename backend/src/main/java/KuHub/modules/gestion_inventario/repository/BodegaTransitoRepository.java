package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.BodegaTransito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface BodegaTransitoRepository extends JpaRepository<BodegaTransito, Integer> {
    Optional<BodegaTransito> findByInventario_IdInventario(Integer idInventario);


    /**
     * Consulta para listar bodega de tránsito por nombre o descripción.
     * Filtra SOLO por el estado activo de la bodega de tránsito, ignorando si el producto o inventario fueron dados de baja.
     */
    @Query(value = """
        SELECT 
            p.nombre_producto,
            p.cod_producto,
            p.descripcion_producto,
            c.nombre_categoria, 
            b.stock, 
            b.stock_limit, 
            u.nombre_unidad,
            u.es_fraccionario,
            b.id_bodega_transito, 
            i.id_inventario, 
            p.id_producto, 
            c.id_categoria, 
            u.id_unidad
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        JOIN categoria c ON c.id_categoria = p.id_categoria
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE b.activo = TRUE 
          AND (
              LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
              OR LOWER(p.descripcion_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
          )
        ORDER BY p.nombre_producto
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
        List<Object[]> searchTransitWarehousePage(
                @Param("searchTerm") String searchTerm,
                @Param("limit") int limit,
                @Param("offset") int offset
    );

    /**
     * Consulta de conteo para la paginación de bodega de tránsito por nombre o descripción.
     */
    @Query(value = """
        SELECT COUNT(*)
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE b.activo = TRUE 
          AND (
              LOWER(p.nombre_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
              OR LOWER(p.descripcion_producto) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
          )
        """, nativeQuery = true)
    long countSearchTransitWarehouse(@Param("searchTerm") String searchTerm);


    /**
     * Búsqueda en tránsito por código de producto.
     * Mantiene los 13 atributos requeridos para el mapeo a WarehousePageDTO.
     */
    @Query(value = """
        SELECT 
            p.nombre_producto, p.cod_producto, p.descripcion_producto,
            c.nombre_categoria, b.stock, b.stock_limit, 
            u.nombre_unidad, u.es_fraccionario,
            b.id_bodega_transito, i.id_inventario, p.id_producto, 
            c.id_categoria, u.id_unidad
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        JOIN categoria c ON c.id_categoria = p.id_categoria
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE b.activo = TRUE 
          AND LOWER(p.cod_producto) LIKE LOWER(CONCAT('%', :codProducto, '%'))
        ORDER BY p.nombre_producto
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
    List<Object[]> searchWarehouseByCodProductPage(
            @Param("codProducto") String codProducto,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /**
     * Conteo para paginación de búsqueda por código.
     */
    @Query(value = """
        SELECT COUNT(*)
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE b.activo = TRUE 
          AND LOWER(p.cod_producto) LIKE LOWER(CONCAT('%', :codProducto, '%'))
    """, nativeQuery = true)
    long countSearchWarehouseByCodProduct(@Param("codProducto") String codProducto);

    /**
     * Consulta para listar bodega de tránsito con consulta dinámica según filtros.
     * Filtra SOLO por el estado activo de la bodega de tránsito.
     */
    @Query(value = """
        SELECT
            p.nombre_producto,
            p.cod_producto,
            p.descripcion_producto,
            c.nombre_categoria,
            b.stock,             -- CAMBIADO: Stock en tránsito
            b.stock_limit,       -- CAMBIADO: Límite en tránsito
            u.nombre_unidad,
            u.es_fraccionario,
            b.id_bodega_transito,-- CAMBIADO: ID Principal
            i.id_inventario,
            p.id_producto,
            c.id_categoria,
            u.id_unidad
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        JOIN categoria c ON c.id_categoria = p.id_categoria
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE
            b.activo = TRUE      -- CAMBIADO: Solo importa si el registro de tránsito está activo
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
                OR b.stock <= b.stock_limit  -- CAMBIADO: Evalúa el stock bajo de la bodega de tránsito
            )
            AND (
                        :ocultarAgotados = FALSE
                        OR b.stock > 0
                    )
        ORDER BY\s
                CASE WHEN :isAsc = TRUE THEN p.nombre_producto END ASC,
                CASE WHEN :isAsc = FALSE THEN p.nombre_producto END DESC
        LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
    List<Object[]> findTransitWarehousePage(
            @Param("useCategorias") boolean useCategorias,
            @Param("categoriasIds") Integer[] categoriasIds,
            @Param("useUnidades") boolean useUnidades,
            @Param("unidadesIds") Integer[] unidadesIds,
            @Param("soloStockBajo") boolean soloStockBajo,
            @Param("ocultarAgotados") boolean ocultarAgotados, // Nuevo
            @Param("isAsc") boolean isAsc,
            @Param("limit") int limit,
            @Param("offset") int offset
    );


    /**
     * Consulta para contar y calcular el total de páginas de la bodega de tránsito
     * con consulta dinámica según filtros.
     */
    @Query(value = """
        SELECT COUNT(*)
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE
            b.activo = TRUE      -- CAMBIADO: Solo importa si el registro de tránsito está activo
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
                OR b.stock <= b.stock_limit  -- CAMBIADO: Evalúa el stock en tránsito
            )
            AND (
                :ocultarAgotados = FALSE
                OR b.stock > 0
            )
    """, nativeQuery = true)
    long countTransitWarehouseFiltered(
            @Param("useCategorias") boolean useCategorias,
            @Param("categoriasIds") Integer[] categoriasIds,
            @Param("useUnidades") boolean useUnidades,
            @Param("unidadesIds") Integer[] unidadesIds,
            @Param("soloStockBajo") boolean soloStockBajo,
            @Param("ocultarAgotados") boolean ocultarAgotados
    );

    /**
     * Busca un único registro de tránsito devolviendo los 13 campos exactos
     * para el mapeo a WarehousePageDTO.
     */
    @Query(value = """
        SELECT 
            p.nombre_producto,      -- 0
            p.cod_producto,         -- 1
            p.descripcion_producto, -- 2
            c.nombre_categoria,     -- 3
            b.stock,                -- 4
            b.stock_limit,          -- 5
            u.nombre_unidad,        -- 6
            u.es_fraccionario,      -- 7
            b.id_bodega_transito,   -- 8
            i.id_inventario,        -- 9
            p.id_producto,          -- 10
            c.id_categoria,         -- 11
            u.id_unidad             -- 12
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        JOIN categoria c ON c.id_categoria = p.id_categoria
        JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE b.id_bodega_transito = :id
    """, nativeQuery = true)
    Optional<Object[]> findSingleTransitById(@Param("id") Integer id);



    /**Metodo para sumar stock en transito afin de evitar procesos en paralelo*/
    @Modifying
    @Transactional
    @Query("UPDATE BodegaTransito b SET b.stock = b.stock + :cantidad " +
            "WHERE b.inventario.idInventario = :idInventario AND b.activo = true")
    int addStockInTransit(@Param("idInventario") Integer idInventario,
                             @Param("cantidad") java.math.BigDecimal cantidad);

    /**Validaciones boleanas*/
    boolean existsBodegaTransitosByInventario_IdInventario(Integer inventarioIdInventario);
    boolean existsByIdBodegaTransitoAndActivo(Integer id, boolean activo);
    boolean existsByIdBodegaTransitoAndStock(Integer id, BigDecimal stock);

}
