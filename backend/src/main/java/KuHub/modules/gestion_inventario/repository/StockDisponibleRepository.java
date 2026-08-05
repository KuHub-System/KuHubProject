package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.StockDisponible;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockDisponibleRepository extends JpaRepository<StockDisponible, Integer> {

    /**
     * Cuenta los PRODUCTOS DISTINTOS con disponible activo por tipo (y opcionalmente categoría),
     * para la paginación de la vista AGRUPADA. Es un control de "cuánto hay disponible de cada
     * producto", no un historial de eventos: cada producto cuenta una sola vez sin importar
     * cuántos registros individuales de sobrante lo componen.
     */
    @Query(value = """
            SELECT COUNT(DISTINCT sd.id_producto)
            FROM stock_disponible sd
            JOIN producto p ON p.id_producto = sd.id_producto
            WHERE sd.tipo_disponible = :tipo AND sd.activo = TRUE
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            """, nativeQuery = true)
    long countAgrupadoByTipoAndActivo(@Param("tipo") String tipo, @Param("idCategoria") Integer idCategoria, @Param("busqueda") String busqueda);

    /** Cuenta los registros individuales (uno por evento de sobrante) para la paginación de la vista SIN agrupar. */
    @Query(value = """
            SELECT COUNT(sd.id_stock_disponible)
            FROM stock_disponible sd
            JOIN producto p ON p.id_producto = sd.id_producto
            WHERE sd.tipo_disponible = :tipo AND sd.activo = TRUE
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            """, nativeQuery = true)
    long countIndividualByTipoAndActivo(@Param("tipo") String tipo, @Param("idCategoria") Integer idCategoria, @Param("busqueda") String busqueda);

    /**
     * Retorna página de stock disponible AGRUPADA Y SUMADA por producto (filtrable por categoría):
     * un producto puede tener varios registros individuales de sobrante (uno por evento detectado),
     * pero esta vista es un control de disponibilidad, no una bitácora, así que se muestra el total
     * vigente por producto sin importar cuántos registros ni en qué fecha se generó cada uno. No hay
     * un único autor por fila agrupada, así que "usuario" va NULL (columna [7]).
     * [0] nombre_producto
     * [1] nombre_categoria
     * [2] cantidad (SUMA de todos los registros activos del producto)
     * [3] nombre_unidad
     * [4] abreviatura
     * [5] fecha_registro (más reciente entre los registros agrupados)
     * [6] tipo_disponible
     * [7] usuario (siempre NULL en esta vista)
     */
    @Query(value = """
            SELECT
                p.nombre_producto,               -- [0]
                c.nombre_categoria,               -- [1]
                SUM(sd.cantidad),                 -- [2]
                um.nombre_unidad,                 -- [3]
                um.abreviatura,                   -- [4]
                CAST(MAX(sd.fecha_registro) AS VARCHAR), -- [5]
                :tipo,                            -- [6]
                NULL                               -- [7]
            FROM stock_disponible sd
            JOIN producto p  ON p.id_producto  = sd.id_producto
            JOIN categoria c ON c.id_categoria = p.id_categoria
            JOIN unidad_medida um ON um.id_unidad = p.id_unidad
            WHERE sd.tipo_disponible = :tipo AND sd.activo = TRUE
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            GROUP BY p.id_producto, p.nombre_producto, c.nombre_categoria, um.nombre_unidad, um.abreviatura
            ORDER BY MAX(sd.fecha_registro) DESC, p.nombre_producto ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Object[]> findAgrupadoByTipoPaginado(
            @Param("tipo") String tipo,
            @Param("idCategoria") Integer idCategoria,
            @Param("busqueda") String busqueda,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /**
     * Retorna página de stock disponible SIN agrupar: una fila por cada evento de registro
     * individual, con el nombre del usuario que lo registró (LEFT JOIN porque los registros
     * previos a la columna id_usuario no tienen autor). Misma vista que el historial de
     * Movimientos, pero para sobrantes.
     * [0] nombre_producto
     * [1] nombre_categoria
     * [2] cantidad (de ESE registro puntual, sin sumar con otros)
     * [3] nombre_unidad
     * [4] abreviatura
     * [5] fecha_registro (de ESE registro puntual)
     * [6] tipo_disponible
     * [7] usuario (nombre completo de quien lo registró, o NULL si no tiene autor)
     */
    @Query(value = """
            SELECT
                p.nombre_producto,        -- [0]
                c.nombre_categoria,       -- [1]
                sd.cantidad,              -- [2]
                um.nombre_unidad,         -- [3]
                um.abreviatura,           -- [4]
                CAST(sd.fecha_registro AS VARCHAR), -- [5]
                sd.tipo_disponible,       -- [6]
                CONCAT_WS(' ', u.p_nombre, u.s_nombre, u.app_paterno, u.app_materno) -- [7]
            FROM stock_disponible sd
            JOIN producto p  ON p.id_producto  = sd.id_producto
            JOIN categoria c ON c.id_categoria = p.id_categoria
            JOIN unidad_medida um ON um.id_unidad = p.id_unidad
            LEFT JOIN usuario u ON u.id_usuario = sd.id_usuario
            WHERE sd.tipo_disponible = :tipo AND sd.activo = TRUE
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            ORDER BY sd.fecha_registro DESC, p.nombre_producto ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Object[]> findIndividualByTipoPaginado(
            @Param("tipo") String tipo,
            @Param("idCategoria") Integer idCategoria,
            @Param("busqueda") String busqueda,
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
     * (solicitudes EN_PEDIDO ya abastecidas) − reservado (a solicitudes EN_PEDIDO). Paginado,
     * filtrable por categoría y por nombre de producto (búsqueda), para escalar cuando crezca
     * el catálogo. Mismo cálculo que la columna "Disponible" de Generar OP / "Por Pedido" del
     * Conglomerado.
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
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            ORDER BY p.nombre_producto ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Object[]> findDisponibleRealPaginado(
            @Param("idCategoria") Integer idCategoria,
            @Param("busqueda") String busqueda,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de filas de Disponible Real bajo los mismos filtros, para calcular paginación. */
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
            SELECT COUNT(*)
            FROM inventario i
            JOIN producto p       ON p.id_producto  = i.id_producto
            LEFT JOIN bodega_transito bt ON bt.id_inventario = i.id_inventario AND bt.activo = TRUE
            LEFT JOIN demanda d          ON d.id_producto    = i.id_producto
            LEFT JOIN reservas rv        ON rv.id_producto   = i.id_producto
            WHERE i.activo = TRUE
              AND (COALESCE(i.stock, 0) + COALESCE(bt.stock, 0) > 0
                   OR COALESCE(d.demanda, 0) + COALESCE(rv.reservado, 0) > 0)
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            """, nativeQuery = true)
    long countDisponibleReal(@Param("idCategoria") Integer idCategoria, @Param("busqueda") String busqueda);
}
