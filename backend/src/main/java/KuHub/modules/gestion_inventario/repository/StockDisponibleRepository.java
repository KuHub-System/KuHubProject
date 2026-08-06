package KuHub.modules.gestion_inventario.repository;

import KuHub.modules.gestion_inventario.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Consultas agregadas de disponibilidad en vivo (inventario, bodega de tránsito, demanda
 * comprometida). No hay una entity propia de "stock disponible" — la tabla stock_disponible
 * (eventos de sobrante registrados a mano) fue eliminada; todo acá se calcula en tiempo real
 * contra inventario/bodega_transito/solicitud. El generic type JpaRepository&lt;Producto, Integer&gt;
 * es solo el requisito técnico de Spring Data JPA (necesita una entity mapeada válida para
 * resolver el repositorio), no implica que este repositorio haga CRUD sobre Producto.
 */
@Repository
public interface StockDisponibleRepository extends JpaRepository<Producto, Integer> {

    /**
     * Disponible real por producto = (inventario + bodega de tránsito) − demanda comprometida
     * (solicitudes EN_PEDIDO ya abastecidas) − reservado (a solicitudes EN_PEDIDO). Paginado,
     * filtrable por categoría y por nombre de producto (búsqueda), para escalar cuando crezca
     * el catálogo. Mismo cálculo que la columna "Disponible" de Generar OP / "Por Pedido" del
     * Conglomerado.
     * A cada solicitud se le descuenta de su demanda lo que ELLA MISMA ya tenía reservado (CTE
     * reservas_sol): sin eso, una solicitud cubierta en parte con stock propio y en parte con el
     * proveedor cuenta la porción reservada dos veces al llegar la OP. Ver el detalle del caso en
     * OrdenPedidoRepository.findDisponibleRealByProductos, que comparte el criterio.
     * [0] nombre_producto
     * [1] nombre_categoria
     * [2] abreviatura
     * [3] inventario           (stock actual en inventario)
     * [4] bodega_transito      (stock actual en bodega de tránsito)
     * [5] stock_fisico         (inventario + bodega de tránsito)
     * [6] demanda_comprometida (Σ demanda de solicitudes EN_PEDIDO abastecidas, sin su parte reservada)
     * [7] reservado            (Σ reservas activas de solicitudes EN_PEDIDO)
     * [8] disponible           (stock_fisico − demanda_comprometida − reservado; puede ser negativo)
     */
    @Query(value = """
            WITH reservas_sol AS (
                SELECT r.id_solicitud, r.id_producto, r.cantidad
                FROM reserva_stock_solicitud r
                JOIN solicitud s ON s.id_solicitud = r.id_solicitud
                WHERE r.activo = TRUE AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            abastecidas AS (
                SELECT DISTINCT dops.id_solicitud, dop.id_producto
                FROM detalle_orden_pedido_solicitud dops
                JOIN detalle_orden_pedido dop ON dop.id_detalle_orden_pedido = dops.id_detalle_orden_pedido
                JOIN solicitud s              ON s.id_solicitud              = dops.id_solicitud
                WHERE dops.activo = TRUE AND dop.activo = TRUE AND dop.entregado = TRUE
                  AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            demanda AS (
                SELECT ds.id_producto,
                       SUM(GREATEST(ds.cant_producto_solicitud - COALESCE(rs.cantidad, 0), 0)) AS demanda
                FROM abastecidas a
                JOIN detalle_solicitud ds ON ds.id_solicitud = a.id_solicitud AND ds.id_producto = a.id_producto
                LEFT JOIN reservas_sol rs ON rs.id_solicitud = ds.id_solicitud AND rs.id_producto = ds.id_producto
                GROUP BY ds.id_producto
            ),
            reservas AS (
                SELECT id_producto, SUM(cantidad) AS reservado
                FROM reservas_sol
                GROUP BY id_producto
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
            WITH reservas_sol AS (
                SELECT r.id_solicitud, r.id_producto, r.cantidad
                FROM reserva_stock_solicitud r
                JOIN solicitud s ON s.id_solicitud = r.id_solicitud
                WHERE r.activo = TRUE AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            abastecidas AS (
                SELECT DISTINCT dops.id_solicitud, dop.id_producto
                FROM detalle_orden_pedido_solicitud dops
                JOIN detalle_orden_pedido dop ON dop.id_detalle_orden_pedido = dops.id_detalle_orden_pedido
                JOIN solicitud s              ON s.id_solicitud              = dops.id_solicitud
                WHERE dops.activo = TRUE AND dop.activo = TRUE AND dop.entregado = TRUE
                  AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            demanda AS (
                SELECT ds.id_producto,
                       SUM(GREATEST(ds.cant_producto_solicitud - COALESCE(rs.cantidad, 0), 0)) AS demanda
                FROM abastecidas a
                JOIN detalle_solicitud ds ON ds.id_solicitud = a.id_solicitud AND ds.id_producto = a.id_producto
                LEFT JOIN reservas_sol rs ON rs.id_solicitud = ds.id_solicitud AND rs.id_producto = ds.id_producto
                GROUP BY ds.id_producto
            ),
            reservas AS (
                SELECT id_producto, SUM(cantidad) AS reservado
                FROM reservas_sol
                GROUP BY id_producto
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

    /**
     * Disponible EN INVENTARIO por producto: del stock que hoy está físicamente en inventario,
     * cuánto no está comprometido con ninguna solicitud EN_PEDIDO. Reemplaza la lectura de la
     * tabla stock_disponible (sobrantes registrados a mano por diálogo) por un cálculo en vivo.
     *
     * El punto fino es que el TRASLADO a bodega de tránsito RESTA de inventario.stock (ver
     * MovimientoServiceImpl) pero no baja el compromiso: la solicitud sigue EN_PEDIDO y su reserva
     * sigue activa. Restar el compromiso entero de inventario.stock descontaría dos veces lo que ya
     * se abasteció a bodega. Por eso primero se descuenta la parte del compromiso que ya está
     * cubierta por el stock de bodega:
     *
     *   comprometido      = demanda + reservado
     *   cubierto_bodega   = LEAST(bodega, comprometido)
     *   disponible_inv    = inventario − (comprometido − cubierto_bodega)
     *   excedente_bodega  = bodega − cubierto_bodega
     *
     * El LEAST replica, agregado por producto, el reparto cronológico que hace coberturaBodega en
     * PedidoMasivoModal.tsx (Abastecimiento de Bodega): ahí el pool de bodega se consume solicitud
     * por solicitud en orden de fecha, pero el orden solo decide A QUIÉN se le asigna — el total
     * consumido del pool siempre es LEAST(stock de bodega, demanda). Por eso acá no hace falta
     * replicar ese greedy ni mirar los movimientos TRASLADO uno por uno.
     *
     * Por construcción disponible_inv + excedente_bodega = el "disponible" de Disponible Real: son
     * la partición de ese mismo número entre lo usable ahora desde inventario y lo que existe pero
     * requiere un movimiento de DEVOLUCION desde bodega para volver a estarlo.
     *
     * A diferencia de {@link #findDisponibleRealPaginado}, la demanda acá descuenta por solicitud lo
     * que esa misma solicitud ya tenía reservado (CTE reservas_sol): sin eso, una solicitud cubierta
     * en parte con stock propio y en parte con el proveedor cuenta la porción reservada dos veces
     * (una dentro de cant_producto_solicitud y otra como reserva). Corregirlo también en
     * findDisponibleRealPaginado y en OrdenPedidoRepository.findDisponibleRealByProductos quedó
     * pendiente aparte, porque impacta Generar OP y el Conglomerado.
     * [0] nombre_producto
     * [1] nombre_categoria
     * [2] abreviatura
     * [3] inventario          (stock físico actual en inventario)
     * [4] bodega_transito     (stock físico actual en bodega de tránsito)
     * [5] comprometido        (demanda de solicitudes EN_PEDIDO abastecidas + reservado)
     * [6] cubierto_bodega     (parte del compromiso que ya está físicamente en bodega)
     * [7] disponible_inventario (puede ser negativo = falta stock en inventario para cubrirlo)
     * [8] excedente_bodega    (stock de bodega sin compromiso; volver por DEVOLUCION)
     */
    @Query(value = """
            WITH reservas_sol AS (
                SELECT r.id_solicitud, r.id_producto, r.cantidad
                FROM reserva_stock_solicitud r
                JOIN solicitud s ON s.id_solicitud = r.id_solicitud
                WHERE r.activo = TRUE AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            abastecidas AS (
                SELECT DISTINCT dops.id_solicitud, dop.id_producto
                FROM detalle_orden_pedido_solicitud dops
                JOIN detalle_orden_pedido dop ON dop.id_detalle_orden_pedido = dops.id_detalle_orden_pedido
                JOIN solicitud s              ON s.id_solicitud              = dops.id_solicitud
                WHERE dops.activo = TRUE AND dop.activo = TRUE AND dop.entregado = TRUE
                  AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            demanda AS (
                SELECT ds.id_producto,
                       SUM(GREATEST(ds.cant_producto_solicitud - COALESCE(rs.cantidad, 0), 0)) AS demanda
                FROM abastecidas a
                JOIN detalle_solicitud ds ON ds.id_solicitud = a.id_solicitud AND ds.id_producto = a.id_producto
                LEFT JOIN reservas_sol rs ON rs.id_solicitud = ds.id_solicitud AND rs.id_producto = ds.id_producto
                GROUP BY ds.id_producto
            ),
            reservas AS (
                SELECT id_producto, SUM(cantidad) AS reservado
                FROM reservas_sol
                GROUP BY id_producto
            ),
            base AS (
                SELECT
                    p.nombre_producto,
                    c.nombre_categoria,
                    um.abreviatura,
                    COALESCE(i.stock, 0)  AS inventario,
                    COALESCE(bt.stock, 0) AS bodega,
                    COALESCE(d.demanda, 0) + COALESCE(rv.reservado, 0) AS comprometido
                FROM inventario i
                JOIN producto p       ON p.id_producto  = i.id_producto
                JOIN categoria c      ON c.id_categoria = p.id_categoria
                JOIN unidad_medida um ON um.id_unidad   = p.id_unidad
                LEFT JOIN bodega_transito bt ON bt.id_inventario = i.id_inventario AND bt.activo = TRUE
                LEFT JOIN demanda d          ON d.id_producto    = i.id_producto
                LEFT JOIN reservas rv        ON rv.id_producto   = i.id_producto
                WHERE i.activo = TRUE
                  AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
                  AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            )
            SELECT
                b.nombre_producto,                                                   -- [0]
                b.nombre_categoria,                                                  -- [1]
                b.abreviatura,                                                       -- [2]
                b.inventario,                                                        -- [3]
                b.bodega,                                                             -- [4]
                b.comprometido,                                                      -- [5]
                LEAST(b.bodega, b.comprometido),                                     -- [6]
                b.inventario - (b.comprometido - LEAST(b.bodega, b.comprometido)),   -- [7]
                b.bodega - LEAST(b.bodega, b.comprometido)                           -- [8]
            FROM base b
            WHERE b.inventario > 0 OR b.bodega > 0 OR b.comprometido > 0
            ORDER BY b.nombre_producto ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Object[]> findDisponibleInventarioPaginado(
            @Param("idCategoria") Integer idCategoria,
            @Param("busqueda") String busqueda,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de filas del disponible de inventario bajo los mismos filtros, para calcular paginación. */
    @Query(value = """
            WITH reservas_sol AS (
                SELECT r.id_solicitud, r.id_producto, r.cantidad
                FROM reserva_stock_solicitud r
                JOIN solicitud s ON s.id_solicitud = r.id_solicitud
                WHERE r.activo = TRUE AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            abastecidas AS (
                SELECT DISTINCT dops.id_solicitud, dop.id_producto
                FROM detalle_orden_pedido_solicitud dops
                JOIN detalle_orden_pedido dop ON dop.id_detalle_orden_pedido = dops.id_detalle_orden_pedido
                JOIN solicitud s              ON s.id_solicitud              = dops.id_solicitud
                WHERE dops.activo = TRUE AND dop.activo = TRUE AND dop.entregado = TRUE
                  AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            ),
            demanda AS (
                SELECT ds.id_producto,
                       SUM(GREATEST(ds.cant_producto_solicitud - COALESCE(rs.cantidad, 0), 0)) AS demanda
                FROM abastecidas a
                JOIN detalle_solicitud ds ON ds.id_solicitud = a.id_solicitud AND ds.id_producto = a.id_producto
                LEFT JOIN reservas_sol rs ON rs.id_solicitud = ds.id_solicitud AND rs.id_producto = ds.id_producto
                GROUP BY ds.id_producto
            ),
            reservas AS (
                SELECT id_producto, SUM(cantidad) AS reservado
                FROM reservas_sol
                GROUP BY id_producto
            )
            SELECT COUNT(*)
            FROM inventario i
            JOIN producto p ON p.id_producto = i.id_producto
            LEFT JOIN bodega_transito bt ON bt.id_inventario = i.id_inventario AND bt.activo = TRUE
            LEFT JOIN demanda d          ON d.id_producto    = i.id_producto
            LEFT JOIN reservas rv        ON rv.id_producto   = i.id_producto
            WHERE i.activo = TRUE
              AND (COALESCE(i.stock, 0) > 0
                   OR COALESCE(bt.stock, 0) > 0
                   OR COALESCE(d.demanda, 0) + COALESCE(rv.reservado, 0) > 0)
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            """, nativeQuery = true)
    long countDisponibleInventario(@Param("idCategoria") Integer idCategoria, @Param("busqueda") String busqueda);

    /**
     * Sobrante en bodega de tránsito para un período: stock físico actual de bodega menos la
     * demanda de las solicitudes EN_PEDIDO (pedido APROBADO) cuya fecha_solicitada cae dentro del
     * rango. Reemplaza el cálculo por eventos registrados manualmente (tabla stock_disponible):
     * lo que sobra del stock de bodega después de cubrir esas solicitudes es lo que hoy no está
     * asociado a ninguna entrega pendiente en ese tramo. Solo retorna sobrante > 0.
     * [0] nombre_producto
     * [1] nombre_categoria
     * [2] nombre_unidad
     * [3] abreviatura
     * [4] stock_bodega_transito (stock físico actual)
     * [5] cantidad_demandada    (Σ solicitudes EN_PEDIDO pendientes en el rango)
     * [6] cantidad_sobrante     (stock_bodega_transito − cantidad_demandada)
     */
    @Query(value = """
            WITH demanda_periodo AS (
                SELECT ds.id_producto, SUM(ds.cant_producto_solicitud) AS cantidad
                FROM detalle_solicitud ds
                JOIN solicitud sol         ON sol.id_solicitud = ds.id_solicitud
                JOIN pedido_solicitud psol ON psol.id_solicitud = sol.id_solicitud
                JOIN pedido ped            ON ped.id_pedido = psol.id_pedido
                WHERE sol.estado_solicitud = 'EN_PEDIDO'
                  AND ped.estado_pedido = 'APROBADO'
                  AND sol.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
                GROUP BY ds.id_producto
            )
            SELECT
                p.nombre_producto,                                 -- [0]
                c.nombre_categoria,                                -- [1]
                um.nombre_unidad,                                  -- [2]
                um.abreviatura,                                    -- [3]
                bt.stock,                                          -- [4]
                COALESCE(dp.cantidad, 0),                          -- [5]
                (bt.stock - COALESCE(dp.cantidad, 0))              -- [6]
            FROM bodega_transito bt
            JOIN inventario inv ON inv.id_inventario = bt.id_inventario AND inv.activo = TRUE
            JOIN producto p     ON p.id_producto = inv.id_producto AND p.activo = TRUE
            JOIN categoria c    ON c.id_categoria = p.id_categoria
            JOIN unidad_medida um ON um.id_unidad = p.id_unidad
            LEFT JOIN demanda_periodo dp ON dp.id_producto = p.id_producto
            WHERE bt.activo = TRUE
              AND (bt.stock - COALESCE(dp.cantidad, 0)) > 0
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            ORDER BY p.nombre_producto ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Object[]> findSobranteBodegaTransitoPeriodoPaginado(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin,
            @Param("idCategoria") Integer idCategoria,
            @Param("busqueda") String busqueda,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de filas del sobrante de bodega de tránsito por período, mismos filtros que {@link #findSobranteBodegaTransitoPeriodoPaginado}. */
    @Query(value = """
            WITH demanda_periodo AS (
                SELECT ds.id_producto, SUM(ds.cant_producto_solicitud) AS cantidad
                FROM detalle_solicitud ds
                JOIN solicitud sol         ON sol.id_solicitud = ds.id_solicitud
                JOIN pedido_solicitud psol ON psol.id_solicitud = sol.id_solicitud
                JOIN pedido ped            ON ped.id_pedido = psol.id_pedido
                WHERE sol.estado_solicitud = 'EN_PEDIDO'
                  AND ped.estado_pedido = 'APROBADO'
                  AND sol.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
                GROUP BY ds.id_producto
            )
            SELECT COUNT(*)
            FROM bodega_transito bt
            JOIN inventario inv ON inv.id_inventario = bt.id_inventario AND inv.activo = TRUE
            JOIN producto p     ON p.id_producto = inv.id_producto AND p.activo = TRUE
            LEFT JOIN demanda_periodo dp ON dp.id_producto = p.id_producto
            WHERE bt.activo = TRUE
              AND (bt.stock - COALESCE(dp.cantidad, 0)) > 0
              AND (:idCategoria IS NULL OR p.id_categoria = :idCategoria)
              AND (:busqueda IS NULL OR :busqueda = '' OR p.nombre_producto ILIKE CONCAT('%', :busqueda, '%'))
            """, nativeQuery = true)
    long countSobranteBodegaTransitoPeriodo(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin,
            @Param("idCategoria") Integer idCategoria,
            @Param("busqueda") String busqueda);
}
