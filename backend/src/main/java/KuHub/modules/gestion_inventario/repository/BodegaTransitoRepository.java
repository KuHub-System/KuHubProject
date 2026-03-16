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

    /** Busca una bodega de tránsito por el ID de su inventario asociado. */
    Optional<BodegaTransito> findByInventario_IdInventario(Integer idInventario);


    /** Lista paginada de bodega de tránsito filtrada por nombre o descripción del producto. */
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

    /** Cuenta el total de registros de bodega de tránsito filtrados por nombre o descripción para calcular la paginación. */
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


    /** Lista paginada de bodega de tránsito filtrada por código de producto. */
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

    /** Cuenta el total de registros de bodega de tránsito filtrados por código de producto para calcular la paginación. */
    @Query(value = """
        SELECT COUNT(*)
        FROM bodega_transito b
        JOIN inventario i ON i.id_inventario = b.id_inventario
        JOIN producto p ON p.id_producto = i.id_producto
        WHERE b.activo = TRUE 
          AND LOWER(p.cod_producto) LIKE LOWER(CONCAT('%', :codProducto, '%'))
    """, nativeQuery = true)
    long countSearchWarehouseByCodProduct(@Param("codProducto") String codProducto);

    /** Lista paginada de bodega de tránsito con filtros dinámicos: categorías, unidades, stock bajo y agotados. */
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


    /** Cuenta el total de registros de bodega de tránsito según filtros dinámicos para calcular la paginación. */
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
     * Retorna el detalle completo de un registro de tránsito específico mapeado por índice de columna.
     * Usado para sincronizar la vista del frontend cuando otro usuario actualizó en paralelo.
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
        WHERE b.id_bodega_transito = :idBodegaTransito
    """, nativeQuery = true)
    Optional<Object[]> findSingleTransitById(@Param("idBodegaTransito") Integer idBodegaTransito);


    // ─── MODIFICACIONES ──────────────────────────────────────────────────────────

    /**Metodo para sumar stock en transito afin de evitar procesos en paralelo*/
    @Modifying
    @Transactional
    @Query("UPDATE BodegaTransito b SET b.stock = b.stock + :cantidad " +
            "WHERE b.inventario.idInventario = :idInventario AND b.activo = true")
    int addStockInTransit(@Param("idInventario") Integer idInventario,
                             @Param("cantidad") java.math.BigDecimal cantidad);

    // ─── BOOLEANOS ───────────────────────────────────────────────────────────────

    /** Verifica si existe una bodega de tránsito asociada al ID de inventario indicado. */
    boolean existsBodegaTransitosByInventario_IdInventario(Integer inventarioIdInventario);
    /** Verifica si existe una bodega de tránsito con el ID y estado activo indicados. */
    boolean existsByIdBodegaTransitoAndActivo(Integer id, boolean activo);
    /** Verifica si existe una bodega de tránsito con el ID y stock indicados. */
    boolean existsByIdBodegaTransitoAndStock(Integer id, BigDecimal stock);

}
