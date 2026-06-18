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

    /**
     * Suma la cantidad disponible activa por producto, para un conjunto de productos y un tipo.
     * Solo retorna productos que tienen disponible (> 0). Usado para saber si mostrar el modal
     * de salida con disponibles en bodega de tránsito.
     * [0] id_producto
     * [1] cantidad_disponible (suma)
     */
    @Query(value = """
            SELECT sd.id_producto, COALESCE(SUM(sd.cantidad), 0)
            FROM stock_disponible sd
            WHERE sd.tipo_disponible = :tipo
              AND sd.activo = TRUE
              AND sd.id_producto IN (:ids)
            GROUP BY sd.id_producto
            HAVING COALESCE(SUM(sd.cantidad), 0) > 0
            """, nativeQuery = true)
    List<Object[]> sumDisponibleByProductosAndTipo(@Param("ids") List<Integer> ids, @Param("tipo") String tipo);

    /**
     * Registros activos de un producto y tipo, ordenados FIFO (más antiguo primero)
     * para consumir el disponible al registrar una salida de bodega de tránsito.
     */
    @Query("""
            SELECT sd FROM StockDisponible sd
            WHERE sd.producto.idProducto = :idProducto
              AND sd.tipoDisponible = :tipo
              AND sd.activo = TRUE
            ORDER BY sd.fechaRegistro ASC, sd.idStockDisponible ASC
            """)
    List<StockDisponible> findActivosByProductoAndTipoFifo(@Param("idProducto") Integer idProducto, @Param("tipo") String tipo);

    /**
     * Disponible real por producto = (inventario + bodega de tránsito) − demanda comprometida
     * (solicitudes EN_PEDIDO ya abastecidas) − reservado (a solicitudes EN_PEDIDO). Devuelve TODOS
     * los productos con stock físico o demanda/reservas (sin paginar; el frontend filtra y scrollea).
     * Mismo cálculo que la columna "Disponible" de Generar OP / "Por Pedido" del Conglomerado.
     * [0] nombre_producto
     * [1] nombre_categoria
     * [2] abreviatura
     * [3] inventario           (stock actual en inventario)
     * [4] bodega_transito      (stock actual en bodega de tránsito)
     * [5] stock_fisico         (inventario + bodega de tránsito)
     * [6] demanda_comprometida (Σ demanda de solicitudes EN_PEDIDO abastecidas)
     * [7] reservado            (Σ reservas activas de solicitudes EN_PEDIDO)
     * [8] disponible           (stock_fisico − demanda_comprometida − reservado; puede ser negativo)
     */
    @Query(value = """
            WITH abastecidas AS (
                SELECT DISTINCT dops.id_solicitud, dop.id_producto
                FROM detalle_orden_pedido_solicitud dops
                JOIN detalle_orden_pedido dop ON dop.id_detalle_orden_pedido = dops.id_detalle_orden_pedido
                JOIN solicitud s              ON s.id_solicitud              = dops.id_solicitud
                WHERE dops.activo = TRUE AND dop.activo = TRUE AND dop.entregado = TRUE
                  AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            demanda AS (
                SELECT ds.id_producto, SUM(ds.cant_producto_solicitud) AS demanda
                FROM abastecidas a
                JOIN detalle_solicitud ds ON ds.id_solicitud = a.id_solicitud AND ds.id_producto = a.id_producto
                GROUP BY ds.id_producto
            ),
            reservas AS (
                SELECT r.id_producto, SUM(r.cantidad) AS reservado
                FROM reserva_stock_solicitud r
                JOIN solicitud s ON s.id_solicitud = r.id_solicitud
                WHERE r.activo = TRUE AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
                GROUP BY r.id_producto
            )
            SELECT
                p.nombre_producto,                                                  -- [0]
                c.nombre_categoria,                                                 -- [1]
                um.abreviatura,                                                     -- [2]
                COALESCE(i.stock, 0),                                               -- [3]
                COALESCE(bt.stock, 0),                                              -- [4]
                COALESCE(i.stock, 0) + COALESCE(bt.stock, 0),                       -- [5]
                COALESCE(d.demanda, 0),                                             -- [6]
                COALESCE(rv.reservado, 0),                                          -- [7]
                COALESCE(i.stock, 0) + COALESCE(bt.stock, 0)
                    - COALESCE(d.demanda, 0) - COALESCE(rv.reservado, 0)            -- [8]
            FROM inventario i
            JOIN producto p       ON p.id_producto  = i.id_producto
            JOIN categoria c      ON c.id_categoria = p.id_categoria
            JOIN unidad_medida um ON um.id_unidad   = p.id_unidad
            LEFT JOIN bodega_transito bt ON bt.id_inventario = i.id_inventario AND bt.activo = TRUE
            LEFT JOIN demanda d          ON d.id_producto    = i.id_producto
            LEFT JOIN reservas rv        ON rv.id_producto   = i.id_producto
            WHERE i.activo = TRUE
              AND (COALESCE(i.stock, 0) + COALESCE(bt.stock, 0) > 0
                   OR COALESCE(d.demanda, 0) + COALESCE(rv.reservado, 0) > 0)
            ORDER BY p.nombre_producto ASC
            """, nativeQuery = true)
    List<Object[]> findDisponibleReal();
}
