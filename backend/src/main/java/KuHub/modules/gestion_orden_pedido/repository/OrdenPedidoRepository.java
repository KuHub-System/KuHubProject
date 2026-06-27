package KuHub.modules.gestion_orden_pedido.repository;

import KuHub.modules.gestion_orden_pedido.entity.OrdenPedido;
import KuHub.modules.gestion_orden_pedido.enums.EstadoOrdenPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Repository
public interface OrdenPedidoRepository extends JpaRepository<OrdenPedido, Integer> {

    // ── 1. Métodos JPA derivados ──

    /** Lista OPs activas vinculadas a un pedido. */
    List<OrdenPedido> findByPedido_IdPedidoAndActivoTrue(Integer idPedido);

    /** Lista OPs activas de un proveedor. */
    List<OrdenPedido> findByProveedor_IdProveedorAndActivoTrue(Integer idProveedor);

    /** Verifica si existe una OP activa para un pedido (indicador del Paso 1). */
    boolean existsByPedido_IdPedidoAndActivoTrue(Integer idPedido);

    // ── 2. @Query personalizados de solo lectura ──

    /**
     * Verifica si existe una OP activa de un pedido cuyo estado sea distinto del indicado
     * (bloquea el rechazo de solicitudes EN_PEDIDO). Native porque {@code estado_orden_pedido} es un
     * enum nativo de PostgreSQL ({@code estado_orden_pedido_type}) y un método derivado generaría
     * {@code enum <> varchar}, sin operador en PG; se castea con {@code ::text}.
     */
    @Query(value = """
            SELECT EXISTS(
                SELECT 1 FROM orden_pedido op
                WHERE op.id_pedido = :idPedido
                  AND op.activo = TRUE
                  AND op.estado_orden_pedido::text <> :estado
            )
            """, nativeQuery = true)
    boolean existsOrdenActivaConEstadoDistinto(@Param("idPedido") Integer idPedido, @Param("estado") String estado);

    /**
     * Retorna OPs CONFIRMADAS activas donde todos sus detalles activos ya tienen entregado=true.
     * Usado para la auto-transición CONFIRMADA → RECIBIDA tras un marcarEntregados bulk.
     */
    @Query("""
            SELECT op FROM OrdenPedido op
            WHERE op.idOrdenPedido IN :ids
              AND op.estadoOrdenPedido = 'CONFIRMADA'
              AND op.activo = true
              AND NOT EXISTS (
                  SELECT d FROM DetalleOrdenPedido d
                  WHERE d.ordenPedido = op
                    AND d.activo = true
                    AND d.entregado = false
              )
            """)
    List<OrdenPedido> findConfirmadasConTodosEntregados(@Param("ids") Set<Integer> ids);

    /**
     * Retorna TODAS las OPs CONFIRMADAS activas donde todos sus detalles activos tienen entregado=true.
     * Usado por sincronizarEstadosRecibida para corregir datos históricos o inconsistencias.
     */
    @Query("""
            SELECT op FROM OrdenPedido op
            WHERE op.estadoOrdenPedido = 'CONFIRMADA'
              AND op.activo = true
              AND NOT EXISTS (
                  SELECT d FROM DetalleOrdenPedido d
                  WHERE d.ordenPedido = op
                    AND d.activo = true
                    AND d.entregado = false
              )
            """)
    List<OrdenPedido> findAllConfirmadasConTodosEntregados();

    /**
     * Lista pedidos APROBADO dentro de un rango de fechas con CONTADOR de OPs activas.
     * El front decide chips según cantidades:
     *   [6]=true                      → "Cubierto por reservados" (bloquea generación)
     *   [4]=0 y [5]=0 → "Sin OP"
     *   [4]=0 y [5]>0 → "Existe un registro cancelado, realizar nuevo"
     *   [4]=1         → "OP Generada"
     *   [4]≥2         → "Ya existe un registro para este pedido"
     * [0] id_pedido                    (Integer)
     * [1] fecha_inicio_pedido          (Date)
     * [2] fecha_fin_pedido             (Date)
     * [3] estado_pedido                (String)
     * [4] cantidad_orden_pedido        (Long) — OPs activas con estado != CANCELADA
     * [5] cantidad_orden_canceladas    (Long) — OPs activas con estado == CANCELADA
     * [6] cubierto_por_reservados      (Boolean) — todas las cantidades cubiertas por reserva_stock_solicitud
     */
    @Query(value = """
        SELECT
            p.id_pedido,                                                            -- [0]
            p.fecha_inicio_pedido,                                                  -- [1]
            p.fecha_fin_pedido,                                                     -- [2]
            p.estado_pedido::text,                                                  -- [3]
            (
                SELECT COUNT(*) FROM orden_pedido op
                WHERE op.id_pedido = p.id_pedido
                  AND op.activo = TRUE
                  AND op.estado_orden_pedido <> 'CANCELADA'
            ) AS cantidad_orden_pedido,                                             -- [4]
            (
                SELECT COUNT(*) FROM orden_pedido op
                WHERE op.id_pedido = p.id_pedido
                  AND op.activo = TRUE
                  AND op.estado_orden_pedido = 'CANCELADA'
            ) AS cantidad_orden_canceladas,                                         -- [5]
            (
                EXISTS (
                    SELECT 1
                    FROM pedido_solicitud ps2
                    JOIN solicitud s2 ON s2.id_solicitud = ps2.id_solicitud
                    WHERE ps2.id_pedido = p.id_pedido
                      AND s2.estado_solicitud = 'EN_PEDIDO'
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM pedido_solicitud ps2
                    JOIN solicitud s2        ON s2.id_solicitud  = ps2.id_solicitud
                    JOIN detalle_solicitud ds2 ON ds2.id_solicitud = s2.id_solicitud
                    LEFT JOIN reserva_stock_solicitud rss
                           ON rss.id_solicitud = s2.id_solicitud
                          AND rss.id_producto  = ds2.id_producto
                          AND rss.activo = TRUE
                    WHERE ps2.id_pedido = p.id_pedido
                      AND s2.estado_solicitud = 'EN_PEDIDO'
                      AND ds2.cant_producto_solicitud > COALESCE(rss.cantidad, 0)
                )
            ) AS cubierto_por_reservados                                            -- [6]
        FROM pedido p
        WHERE p.estado_pedido = 'APROBADO'
          AND p.fecha_inicio_pedido >= :fechaInicio
          AND p.fecha_fin_pedido    <= :fechaFin
        ORDER BY p.fecha_inicio_pedido ASC
        """, nativeQuery = true)
    List<Object[]> findPedidosSemanaConIndicadorOP(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin")    LocalDate fechaFin);

    // =====================================================
    // NOTIFICACIONES: pedidos APROBADO sin OP (o con todas CANCELADAS) por semana
    // Retorna [idSemana, nombreSemana, fechaInicio, fechaFin, anio, semestre, cantidad]
    // =====================================================
    /**
     * Agrupa pedidos APROBADOS que no tienen ninguna OP activa no-cancelada, por semana académica.
     * Cubre dos casos: pedido sin OP alguna, y pedido cuyas OPs están todas CANCELADAS.
     * Retorna filas [idSemana, nombreSemana, fechaInicio, fechaFin, anio, semestre, cantidadPendientes].
     */
    @Query(value = """
        SELECT
            sm.id_semana,                      -- [0]
            sm.nombre_semana,                  -- [1]
            sm.fecha_inicio,                   -- [2]
            sm.fecha_fin,                      -- [3]
            sm.anio,                           -- [4]
            sm.semestre,                       -- [5]
            COUNT(*) AS cantidad_pendientes    -- [6]
        FROM pedido p
        JOIN semanas sm ON p.fecha_inicio_pedido = sm.fecha_inicio
                       AND p.fecha_fin_pedido    = sm.fecha_fin
        WHERE p.estado_pedido = 'APROBADO'::estado_pedido_type
          AND NOT EXISTS (
              SELECT 1 FROM orden_pedido op
              WHERE op.id_pedido = p.id_pedido
                AND op.activo    = TRUE
                AND op.estado_orden_pedido != 'CANCELADA'::estado_orden_pedido_type
          )
        GROUP BY sm.id_semana, sm.nombre_semana, sm.fecha_inicio, sm.fecha_fin, sm.anio, sm.semestre
        ORDER BY sm.fecha_inicio ASC
        """, nativeQuery = true)
    List<Object[]> findPedidosAprobadosSinOpPorSemana();

    // =====================================================
    // NOTIFICACIONES: entregas programadas para hoy o ayer (CONFIRMADA, entregado=false)
    // Retorna [idOrdenPedido, nombreDistribuidora, fechaEntrega(text), cantidadProductos]
    // =====================================================
    /**
     * Devuelve las OPs CONFIRMADAS que tienen al menos un detalle activo con entregado=false
     * cuya fecha_entrega es hoy o ayer. Agrupa por OP + proveedor + fecha de entrega.
     * [0] id_orden_pedido      (Integer)
     * [1] nombre_distribuidora (String)
     * [2] fecha_entrega        (String YYYY-MM-DD)
     * [3] cantidad_productos   (Long)
     */
    @Query(value = """
        SELECT
            op.id_orden_pedido,                    -- [0]
            pv.nombre_distribuidora,               -- [1]
            d.fecha_entrega::text,                 -- [2]
            COUNT(*) AS cantidad_productos          -- [3]
        FROM orden_pedido op
        JOIN proveedor pv ON pv.id_proveedor = op.id_proveedor
        JOIN detalle_orden_pedido d ON d.id_orden_pedido = op.id_orden_pedido
        WHERE op.estado_orden_pedido = 'CONFIRMADA'::estado_orden_pedido_type
          AND op.activo = TRUE
          AND d.activo = TRUE
          AND d.entregado = FALSE
          AND d.fecha_entrega IN (CURRENT_DATE, CURRENT_DATE - INTERVAL '1 day')
        GROUP BY op.id_orden_pedido, pv.nombre_distribuidora, d.fecha_entrega
        ORDER BY d.fecha_entrega ASC, pv.nombre_distribuidora ASC
        """, nativeQuery = true)
    List<Object[]> findEntregasPendientesHoyAyer();

    /**
     * Cotización consolidada (Paso 2). Cadena de tablas:
     *
     *   pedido (estado_pedido = 'APROBADO', id IN :idsPedido)
     *     └─ pedido_solicitud
     *           └─ solicitud (estado_solicitud = 'EN_PEDIDO')
     *                 ├─ reserva_sala (id_reserva_sala)  →  dia_semana (dia_semana_type)
     *                 └─ detalle_solicitud (cant_producto_solicitud)
     *                       └─ producto → categoria, unidad_medida
     *
     * Adicional: cada proveedor lleva su lista de {@code diasEntrega} desde
     * {@code proveedor_dia_entrega} para que el frontend calcule las fechas reales de
     * entrega contra la semana seleccionada por el usuario.
     *
     * Estructura del JSON (jerárquica, Patrón C):
     *   [{ idProveedor, nombreDistribuidora, nombreProveedor, telefono, email,
     *      totalProductos, totalNeto, totalConIva,
     *      diasEntrega: [LUNES, MARTES, ...],
     *      categorias: [{ idCategoria, nombreCategoria,
     *                     productos: [{ idProducto, nombreProducto, abreviatura,
     *                                   cantidadTotal, precioNeto, precioConIva,
     *                                   cantidadPorDia: [{dia, cantidad}, ...] }] }] }]
     *
     * Cada producto se asigna al proveedor con menor {@code precio_neto} vigente.
     * Productos sin proveedor disponible se agrupan al final con {@code idProveedor = null}
     * (sin {@code diasEntrega}).
     */
    /**
     * OPs con estado CONFIRMADA y activo=TRUE, agrupadas en JSON jerárquico:
     * OP → días de entrega → categoría → productos (con marca desde proveedor_producto).
     *
     * Filtro de fechas aplicado sobre detalle_orden_pedido.fecha_entrega:
     *   - Desde:  CURRENT_DATE - 15 días (historial fijo, regla de negocio)
     *   - Hasta:  :fechaHasta (controlado por el filtro del frontend)
     *
     * Estructura del JSON retornado (Patrón C — jsonb_agg anidado):
     *   [{ idOrdenPedido, idProveedor, nombreDistribuidora, nombreProveedor,
     *      telefonoProveedor, emailProveedor,
     *      entregas: [{ fechaEntrega,
     *        categorias: [{ nombreCategoria,
     *          productos: [{ idDetalleOrdenPedido, idProducto, nombreProducto,
     *            abreviatura, cantidadSolicitada, marcaProducto, entregado,
     *            idInventario, stock }] }] }] }]
     *
     * Retorna NULL si no hay coincidencias.
     */
    @Query(value = """
WITH productos_entrega AS (
    SELECT
        op.id_orden_pedido,
        op.id_pedido,
        op.id_proveedor,
        pv.nombre_distribuidora,
        pv.nombre_proveedor,
        pv.telefono_proveedor,
        pv.email_proveedor,
        d.fecha_entrega,
        d.id_detalle_orden_pedido,
        d.id_producto,
        pr.nombre_producto,
        um.abreviatura,
        d.cantidad_solicitada,
        COALESCE(pp.marca_producto, '')   AS marca_producto,
        d.entregado,
        um.es_fraccionario,
        inv.id_inventario,
        inv.stock,
        cat.nombre_categoria
    FROM orden_pedido             op
    JOIN proveedor                pv  ON pv.id_proveedor    = op.id_proveedor
    JOIN detalle_orden_pedido     d   ON d.id_orden_pedido  = op.id_orden_pedido
                                     AND d.activo           = TRUE
    JOIN producto                 pr  ON pr.id_producto     = d.id_producto
    JOIN unidad_medida            um  ON um.id_unidad       = pr.id_unidad
    JOIN inventario               inv ON inv.id_producto    = d.id_producto
                                     AND inv.activo         = TRUE
    JOIN categoria                cat ON cat.id_categoria   = pr.id_categoria
    JOIN categoria_abastecimiento ca  ON ca.id_categoria   = pr.id_categoria
                                     AND ca.tipo_abastecimiento = CAST(:tipoAbastecimiento AS tipo_abastecimiento)
    LEFT JOIN proveedor_producto  pp  ON pp.id_proveedor    = op.id_proveedor
                                     AND pp.id_producto     = d.id_producto
                                     AND pp.activo          = TRUE
    WHERE op.estado_orden_pedido  = 'CONFIRMADA'
      AND op.activo               = TRUE
      AND d.fecha_entrega        >= (CURRENT_DATE - INTERVAL '15 days')
      AND d.fecha_entrega        <= CAST(:fechaHasta AS date)
),
agrupado_por_categoria AS (
    SELECT
        id_orden_pedido,
        id_pedido,
        id_proveedor,
        nombre_distribuidora,
        nombre_proveedor,
        telefono_proveedor,
        email_proveedor,
        fecha_entrega,
        nombre_categoria,
        jsonb_agg(
            jsonb_build_object(
                'idDetalleOrdenPedido', id_detalle_orden_pedido,
                'idProducto',           id_producto,
                'nombreProducto',       nombre_producto,
                'abreviatura',          abreviatura,
                'esFraccionario',       es_fraccionario,
                'cantidadSolicitada',   cantidad_solicitada,
                'marcaProducto',        marca_producto,
                'entregado',            entregado,
                'idInventario',         id_inventario,
                'stock',                stock
            )
            ORDER BY nombre_producto ASC
        ) AS productos
    FROM productos_entrega
    GROUP BY id_orden_pedido, id_pedido, id_proveedor, nombre_distribuidora, nombre_proveedor,
             telefono_proveedor, email_proveedor, fecha_entrega, nombre_categoria
),
agrupado_por_dia AS (
    SELECT
        id_orden_pedido,
        id_pedido,
        id_proveedor,
        nombre_distribuidora,
        nombre_proveedor,
        telefono_proveedor,
        email_proveedor,
        fecha_entrega,
        jsonb_agg(
            jsonb_build_object(
                'nombreCategoria', nombre_categoria,
                'productos',       productos
            )
            ORDER BY nombre_categoria ASC
        ) AS categorias
    FROM agrupado_por_categoria
    GROUP BY id_orden_pedido, id_pedido, id_proveedor, nombre_distribuidora, nombre_proveedor,
             telefono_proveedor, email_proveedor, fecha_entrega
),
agrupado_por_op AS (
    SELECT
        id_orden_pedido,
        id_pedido,
        id_proveedor,
        nombre_distribuidora,
        nombre_proveedor,
        telefono_proveedor,
        email_proveedor,
        jsonb_agg(
            jsonb_build_object(
                'fechaEntrega', fecha_entrega::text,
                'categorias',   categorias
            )
            ORDER BY fecha_entrega ASC
        ) AS entregas
    FROM agrupado_por_dia
    GROUP BY id_orden_pedido, id_pedido, id_proveedor, nombre_distribuidora, nombre_proveedor,
             telefono_proveedor, email_proveedor
)
SELECT jsonb_agg(
    jsonb_build_object(
        'idOrdenPedido',       id_orden_pedido,
        'idPedido',            id_pedido,
        'idProveedor',         id_proveedor,
        'nombreDistribuidora', nombre_distribuidora,
        'nombreProveedor',     nombre_proveedor,
        'telefonoProveedor',   telefono_proveedor,
        'emailProveedor',      email_proveedor,
        'entregas',            entregas
    )
    ORDER BY nombre_distribuidora ASC, id_orden_pedido ASC
)
FROM agrupado_por_op
    """, nativeQuery = true)
    String findAbastecimientoConfirmado(@Param("fechaHasta") LocalDate fechaHasta, @Param("tipoAbastecimiento") String tipoAbastecimiento);

    // ── 3. Listado y detalle de Órdenes de Pedido ──

    /**
     * Lista todas las OPs activas con sus datos de cabecera (proveedor, pedido, totales).
     * [0] id_orden_pedido     (Integer)
     * [1] id_pedido           (Integer)
     * [2] fecha_inicio_pedido (String YYYY-MM-DD)
     * [3] fecha_fin_pedido    (String YYYY-MM-DD)
     * [4] id_proveedor        (Integer)
     * [5] nombre_distribuidora(String)
     * [6] nombre_proveedor    (String)
     * [7] fecha_creacion      (Timestamp)
     * [8] estado_orden_pedido (String)
     * [9] observaciones       (String, nullable)
     * [10] cantidad_detalles  (Long)
     * [11] total_neto         (BigDecimal)
     * [12] total_con_iva      (BigDecimal)
     */
    @Query(value = """
        SELECT
            op.id_orden_pedido,
            op.id_pedido,
            ped.fecha_inicio_pedido::text,
            ped.fecha_fin_pedido::text,
            pv.id_proveedor,
            pv.nombre_distribuidora,
            pv.nombre_proveedor,
            op.fecha_creacion,
            op.estado_orden_pedido::text,
            op.observaciones,
            COALESCE((
                SELECT COUNT(*) FROM detalle_orden_pedido d
                WHERE d.id_orden_pedido = op.id_orden_pedido AND d.activo = true
            ), 0) AS cantidad_detalles,
            COALESCE((
                SELECT SUM(d.cantidad_solicitada * COALESCE(d.precio_neto_unitario, 0))
                FROM detalle_orden_pedido d
                WHERE d.id_orden_pedido = op.id_orden_pedido AND d.activo = true
            ), 0) AS total_neto,
            COALESCE((
                SELECT SUM(d.cantidad_solicitada * COALESCE(d.precio_con_iva_unitario, 0))
                FROM detalle_orden_pedido d
                WHERE d.id_orden_pedido = op.id_orden_pedido AND d.activo = true
            ), 0) AS total_con_iva
        FROM orden_pedido op
        JOIN pedido   ped ON ped.id_pedido    = op.id_pedido
        JOIN proveedor pv ON pv.id_proveedor = op.id_proveedor
        WHERE op.activo = true
        ORDER BY op.fecha_creacion DESC
        """, nativeQuery = true)
    List<Object[]> findListaOrdenesNative();

    /**
     * Lista OPs activas cuya fecha_creacion >= fechaDesde. Mismo esquema de columnas que findListaOrdenesNative.
     */
    @Query(value = """
        SELECT
            op.id_orden_pedido,
            op.id_pedido,
            ped.fecha_inicio_pedido::text,
            ped.fecha_fin_pedido::text,
            pv.id_proveedor,
            pv.nombre_distribuidora,
            pv.nombre_proveedor,
            op.fecha_creacion,
            op.estado_orden_pedido::text,
            op.observaciones,
            COALESCE((
                SELECT COUNT(*) FROM detalle_orden_pedido d
                WHERE d.id_orden_pedido = op.id_orden_pedido AND d.activo = true
            ), 0) AS cantidad_detalles,
            COALESCE((
                SELECT SUM(d.cantidad_solicitada * COALESCE(d.precio_neto_unitario, 0))
                FROM detalle_orden_pedido d
                WHERE d.id_orden_pedido = op.id_orden_pedido AND d.activo = true
            ), 0) AS total_neto,
            COALESCE((
                SELECT SUM(d.cantidad_solicitada * COALESCE(d.precio_con_iva_unitario, 0))
                FROM detalle_orden_pedido d
                WHERE d.id_orden_pedido = op.id_orden_pedido AND d.activo = true
            ), 0) AS total_con_iva
        FROM orden_pedido op
        JOIN pedido   ped ON ped.id_pedido    = op.id_pedido
        JOIN proveedor pv ON pv.id_proveedor = op.id_proveedor
        WHERE op.activo = true
          AND op.fecha_creacion >= CAST(:fechaDesde AS timestamp)
        ORDER BY op.fecha_creacion DESC
        """, nativeQuery = true)
    List<Object[]> findListaOrdenesNativeSince(@Param("fechaDesde") String fechaDesde);

    @Query(value = """
WITH
-- Solicitudes EN_PEDIDO ligadas a los pedidos APROBADO seleccionados,
-- con su día de la semana (de reserva_sala, nullable).
solicitudes_relevantes AS (
    SELECT
        ps.id_pedido,
        s.id_solicitud,
        rs.dia_semana::text AS dia_semana
    FROM pedido_solicitud ps
    JOIN pedido    ped ON ped.id_pedido    = ps.id_pedido
    JOIN solicitud s   ON s.id_solicitud   = ps.id_solicitud
    LEFT JOIN reserva_sala rs ON rs.id_reserva_sala = s.id_reserva_sala
    WHERE ps.id_pedido IN (:idsPedido)
      AND ped.estado_pedido      = 'APROBADO'
      AND s.estado_solicitud     = 'EN_PEDIDO'
),

-- Cantidades por (producto, día). SIN_DIA agrupa solicitudes sin reserva_sala.
productos_por_dia AS (
    SELECT
        p.id_producto,
        p.nombre_producto,
        um.es_fraccionario,
        c.id_categoria,
        c.nombre_categoria,
        um.abreviatura,
        COALESCE(sr.dia_semana, 'SIN_DIA') AS dia_semana,
        SUM(ds.cant_producto_solicitud)    AS cantidad
    FROM solicitudes_relevantes sr
    JOIN detalle_solicitud ds ON ds.id_solicitud = sr.id_solicitud
    JOIN producto      p  ON p.id_producto  = ds.id_producto
    JOIN categoria     c  ON c.id_categoria = p.id_categoria
    JOIN unidad_medida um ON um.id_unidad   = p.id_unidad
    WHERE p.activo = TRUE
    GROUP BY
        p.id_producto, p.nombre_producto, um.es_fraccionario,
        c.id_categoria, c.nombre_categoria,
        um.abreviatura, COALESCE(sr.dia_semana, 'SIN_DIA')
),

-- Un row por producto con cantidad total + array JSON de cantidades por día (ordenado).
productos_solicitados AS (
    SELECT
        id_producto,
        nombre_producto,
        es_fraccionario,
        id_categoria,
        nombre_categoria,
        abreviatura,
        SUM(cantidad) AS cantidad_total,
        jsonb_agg(
            jsonb_build_object('dia', dia_semana, 'cantidad', cantidad)
            ORDER BY
                CASE dia_semana
                    WHEN 'LUNES'     THEN 1
                    WHEN 'MARTES'    THEN 2
                    WHEN 'MIERCOLES' THEN 3
                    WHEN 'JUEVES'    THEN 4
                    WHEN 'VIERNES'   THEN 5
                    WHEN 'SABADO'    THEN 6
                    WHEN 'DOMINGO'   THEN 7
                    ELSE 8 -- SIN_DIA al final
                END ASC
        ) AS cantidad_por_dia_json
    FROM productos_por_dia
    GROUP BY id_producto, nombre_producto, es_fraccionario, id_categoria, nombre_categoria, abreviatura
),

-- Desglose por solicitud: cuánto de cada producto demanda cada solicitud y en qué día de
-- necesidad. Una solicitud es atómica (un único día), así que se puede "mover" entera.
solicitud_producto AS (
    SELECT
        ds.id_producto,
        sr.id_solicitud,
        COALESCE(sr.dia_semana, 'SIN_DIA') AS dia_semana,
        SUM(ds.cant_producto_solicitud)    AS cantidad,
        -- Stock ya reservado a esta (solicitud, producto): hay a lo sumo una fila por par (UNIQUE),
        -- por eso MAX (no SUM, que se inflaría si hay varias filas de detalle_solicitud).
        COALESCE(MAX(rss.cantidad), 0)     AS reservado
    FROM solicitudes_relevantes sr
    JOIN detalle_solicitud ds ON ds.id_solicitud = sr.id_solicitud
    JOIN producto p ON p.id_producto = ds.id_producto
    LEFT JOIN reserva_stock_solicitud rss
           ON rss.id_solicitud = sr.id_solicitud
          AND rss.id_producto  = ds.id_producto
          AND rss.activo = TRUE
    WHERE p.activo = TRUE
    GROUP BY ds.id_producto, sr.id_solicitud, COALESCE(sr.dia_semana, 'SIN_DIA')
),

-- Un array JSON de solicitudes por producto (ordenado por día de necesidad).
solicitudes_por_producto AS (
    SELECT
        id_producto,
        jsonb_agg(
            jsonb_build_object(
                'idSolicitud', id_solicitud,
                'dia',         dia_semana,
                'cantidad',    cantidad,
                'reservado',   reservado
            )
            ORDER BY
                CASE dia_semana
                    WHEN 'LUNES'     THEN 1
                    WHEN 'MARTES'    THEN 2
                    WHEN 'MIERCOLES' THEN 3
                    WHEN 'JUEVES'    THEN 4
                    WHEN 'VIERNES'   THEN 5
                    WHEN 'SABADO'    THEN 6
                    WHEN 'DOMINGO'   THEN 7
                    ELSE 8 -- SIN_DIA al final
                END ASC,
                id_solicitud ASC
        ) AS solicitudes_json
    FROM solicitud_producto
    GROUP BY id_producto
),

-- Proveedor con menor precio_neto para cada producto.
mejor_precio AS (
    SELECT DISTINCT ON (pp.id_producto)
        pp.id_producto,
        pp.id_proveedor,
        pp.precio_neto,
        pp.precio_con_iva
    FROM proveedor_producto pp
    JOIN proveedor pv ON pv.id_proveedor = pp.id_proveedor
    WHERE pp.activo = TRUE
      AND pv.activo = TRUE
      AND pv.estado_proveedor = 'DISPONIBLE'
    ORDER BY pp.id_producto, pp.precio_neto ASC
),

-- Días de entrega de cada proveedor (ordenados Lun→Dom).
proveedor_dias AS (
    SELECT
        pde.id_proveedor,
        jsonb_agg(
            pde.dia_semana::text
            ORDER BY
                CASE pde.dia_semana::text
                    WHEN 'LUNES'     THEN 1
                    WHEN 'MARTES'    THEN 2
                    WHEN 'MIERCOLES' THEN 3
                    WHEN 'JUEVES'    THEN 4
                    WHEN 'VIERNES'   THEN 5
                    WHEN 'SABADO'    THEN 6
                    WHEN 'DOMINGO'   THEN 7
                END ASC
        ) AS dias_entrega_json
    FROM proveedor_dia_entrega pde
    GROUP BY pde.id_proveedor
),

productos_con_proveedor AS (
    SELECT
        ps.id_producto,
        ps.nombre_producto,
        ps.es_fraccionario,
        ps.id_categoria,
        ps.nombre_categoria,
        ps.abreviatura,
        ps.cantidad_total,
        ps.cantidad_por_dia_json,
        spp.solicitudes_json,
        mp.id_proveedor,
        mp.precio_neto,
        mp.precio_con_iva,
        pv.nombre_distribuidora,
        pv.nombre_proveedor,
        pv.telefono_proveedor,
        pv.email_proveedor,
        pd.dias_entrega_json
    FROM productos_solicitados ps
    LEFT JOIN solicitudes_por_producto spp ON spp.id_producto = ps.id_producto
    LEFT JOIN mejor_precio    mp ON mp.id_producto  = ps.id_producto
    LEFT JOIN proveedor       pv ON pv.id_proveedor = mp.id_proveedor
    LEFT JOIN proveedor_dias  pd ON pd.id_proveedor = mp.id_proveedor
)

SELECT jsonb_agg(
    jsonb_build_object(
        'idProveedor',         proveedor_grupo.id_proveedor,
        'nombreDistribuidora', proveedor_grupo.nombre_distribuidora,
        'nombreProveedor',     proveedor_grupo.nombre_proveedor,
        'telefono',            proveedor_grupo.telefono_proveedor,
        'email',               proveedor_grupo.email_proveedor,
        'totalProductos',      proveedor_grupo.total_productos,
        'totalNeto',           proveedor_grupo.total_neto,
        'totalConIva',         proveedor_grupo.total_con_iva,
        'diasEntrega',         proveedor_grupo.dias_entrega_json,
        'categorias',          proveedor_grupo.categorias_json
    )
    ORDER BY
        (proveedor_grupo.id_proveedor IS NULL) ASC,
        proveedor_grupo.nombre_distribuidora ASC
) AS cotizacion_json
FROM (
    SELECT
        categoria_grupo.id_proveedor,
        categoria_grupo.nombre_distribuidora,
        categoria_grupo.nombre_proveedor,
        categoria_grupo.telefono_proveedor,
        categoria_grupo.email_proveedor,
        MAX(categoria_grupo.dias_entrega_json::text)::jsonb AS dias_entrega_json,
        SUM(categoria_grupo.conteo_productos)  AS total_productos,
        SUM(categoria_grupo.subtotal_neto)     AS total_neto,
        SUM(categoria_grupo.subtotal_con_iva)  AS total_con_iva,
        jsonb_agg(
            jsonb_build_object(
                'idCategoria',     categoria_grupo.id_categoria,
                'nombreCategoria', categoria_grupo.nombre_categoria,
                'productos',       categoria_grupo.productos_json
            )
            ORDER BY categoria_grupo.nombre_categoria ASC
        ) AS categorias_json
    FROM (
        SELECT
            pcp.id_proveedor,
            pcp.nombre_distribuidora,
            pcp.nombre_proveedor,
            pcp.telefono_proveedor,
            pcp.email_proveedor,
            pcp.id_categoria,
            pcp.nombre_categoria,
            MAX(pcp.dias_entrega_json::text)::jsonb AS dias_entrega_json,
            COUNT(pcp.id_producto)     AS conteo_productos,
            SUM(CASE WHEN pcp.precio_neto IS NOT NULL
                     THEN ROUND(pcp.precio_neto * pcp.cantidad_total, 2)
                     ELSE 0 END) AS subtotal_neto,
            SUM(CASE WHEN pcp.precio_con_iva IS NOT NULL
                     THEN ROUND(pcp.precio_con_iva * pcp.cantidad_total, 2)
                     ELSE 0 END) AS subtotal_con_iva,
            jsonb_agg(
                jsonb_build_object(
                    'idProducto',      pcp.id_producto,
                    'nombreProducto',  pcp.nombre_producto,
                    'abreviatura',     pcp.abreviatura,
                    'esFraccionario',  pcp.es_fraccionario,
                    'cantidadTotal',   pcp.cantidad_total,
                    'precioNeto',      pcp.precio_neto,
                    'precioConIva',    pcp.precio_con_iva,
                    'cantidadPorDia',  pcp.cantidad_por_dia_json,
                    'solicitudes',     pcp.solicitudes_json
                )
                ORDER BY pcp.nombre_producto ASC
            ) AS productos_json
        FROM productos_con_proveedor pcp
        GROUP BY
            pcp.id_proveedor,
            pcp.nombre_distribuidora,
            pcp.nombre_proveedor,
            pcp.telefono_proveedor,
            pcp.email_proveedor,
            pcp.id_categoria,
            pcp.nombre_categoria
    ) AS categoria_grupo
    GROUP BY
        categoria_grupo.id_proveedor,
        categoria_grupo.nombre_distribuidora,
        categoria_grupo.nombre_proveedor,
        categoria_grupo.telefono_proveedor,
        categoria_grupo.email_proveedor
) AS proveedor_grupo
            """, nativeQuery = true)
    String findCotizacionConsolidada(@Param("idsPedido") List<Integer> idsPedido);

    /**
     * Variante de {@code findCotizacionConsolidada} para re-generar OPs canceladas.
     * Aplica el mismo pipeline jerárquico pero {@code solicitudes_relevantes} se restringe
     * a las solicitudes que ya figuraban en las OPs CANCELADAS de los pedidos indicados
     * (vía detalle_orden_pedido → detalle_orden_pedido_solicitud). Retorna únicamente los
     * productos faltantes (los que la OP cancelada tenía asignados), con proveedor, precios
     * y distribución por día idénticos al flujo normal.
     */
    @Query(value = """
WITH
-- OPs CANCELADAS de los pedidos seleccionados.
ordenes_canceladas AS (
    SELECT op.id_orden_pedido
    FROM orden_pedido op
    WHERE op.id_pedido IN (:idsPedido)
      AND op.activo = TRUE
      AND op.estado_orden_pedido = 'CANCELADA'
),
-- Productos que aparecen en esas OPs canceladas: son los faltantes a regenerar.
-- Se filtra por producto (no por solicitud) porque una misma solicitud puede cubrir
-- productos que ya están en una OP activa → filtrar por solicitud los incluiría por error.
productos_en_canceladas AS (
    SELECT DISTINCT dop.id_producto
    FROM detalle_orden_pedido dop
    WHERE dop.id_orden_pedido IN (SELECT id_orden_pedido FROM ordenes_canceladas)
      AND dop.activo = TRUE
),
-- Solicitudes EN_PEDIDO de los pedidos dados (sin filtro de solicitud).
solicitudes_relevantes AS (
    SELECT
        ps.id_pedido,
        s.id_solicitud,
        rs.dia_semana::text AS dia_semana
    FROM pedido_solicitud ps
    JOIN pedido    ped ON ped.id_pedido    = ps.id_pedido
    JOIN solicitud s   ON s.id_solicitud   = ps.id_solicitud
    LEFT JOIN reserva_sala rs ON rs.id_reserva_sala = s.id_reserva_sala
    WHERE ps.id_pedido IN (:idsPedido)
      AND ped.estado_pedido      = 'APROBADO'
      AND s.estado_solicitud     = 'EN_PEDIDO'
),

-- Cantidades por (producto, día) — restringido a productos de canceladas.
productos_por_dia AS (
    SELECT
        p.id_producto,
        p.nombre_producto,
        um.es_fraccionario,
        c.id_categoria,
        c.nombre_categoria,
        um.abreviatura,
        COALESCE(sr.dia_semana, 'SIN_DIA') AS dia_semana,
        SUM(ds.cant_producto_solicitud)    AS cantidad
    FROM solicitudes_relevantes sr
    JOIN detalle_solicitud ds ON ds.id_solicitud = sr.id_solicitud
    JOIN producto      p  ON p.id_producto  = ds.id_producto
    JOIN categoria     c  ON c.id_categoria = p.id_categoria
    JOIN unidad_medida um ON um.id_unidad   = p.id_unidad
    WHERE p.activo = TRUE
      AND p.id_producto IN (SELECT id_producto FROM productos_en_canceladas)
    GROUP BY
        p.id_producto, p.nombre_producto, um.es_fraccionario,
        c.id_categoria, c.nombre_categoria,
        um.abreviatura, COALESCE(sr.dia_semana, 'SIN_DIA')
),

productos_solicitados AS (
    SELECT
        id_producto,
        nombre_producto,
        es_fraccionario,
        id_categoria,
        nombre_categoria,
        abreviatura,
        SUM(cantidad) AS cantidad_total,
        jsonb_agg(
            jsonb_build_object('dia', dia_semana, 'cantidad', cantidad)
            ORDER BY
                CASE dia_semana
                    WHEN 'LUNES'     THEN 1
                    WHEN 'MARTES'    THEN 2
                    WHEN 'MIERCOLES' THEN 3
                    WHEN 'JUEVES'    THEN 4
                    WHEN 'VIERNES'   THEN 5
                    WHEN 'SABADO'    THEN 6
                    WHEN 'DOMINGO'   THEN 7
                    ELSE 8
                END ASC
        ) AS cantidad_por_dia_json
    FROM productos_por_dia
    GROUP BY id_producto, nombre_producto, es_fraccionario, id_categoria, nombre_categoria, abreviatura
),

solicitud_producto AS (
    SELECT
        ds.id_producto,
        sr.id_solicitud,
        COALESCE(sr.dia_semana, 'SIN_DIA') AS dia_semana,
        SUM(ds.cant_producto_solicitud)    AS cantidad,
        COALESCE(MAX(rss.cantidad), 0)     AS reservado
    FROM solicitudes_relevantes sr
    JOIN detalle_solicitud ds ON ds.id_solicitud = sr.id_solicitud
    JOIN producto p ON p.id_producto = ds.id_producto
    LEFT JOIN reserva_stock_solicitud rss
           ON rss.id_solicitud = sr.id_solicitud
          AND rss.id_producto  = ds.id_producto
          AND rss.activo = TRUE
    WHERE p.activo = TRUE
    GROUP BY ds.id_producto, sr.id_solicitud, COALESCE(sr.dia_semana, 'SIN_DIA')
),

solicitudes_por_producto AS (
    SELECT
        id_producto,
        jsonb_agg(
            jsonb_build_object(
                'idSolicitud', id_solicitud,
                'dia',         dia_semana,
                'cantidad',    cantidad,
                'reservado',   reservado
            )
            ORDER BY
                CASE dia_semana
                    WHEN 'LUNES'     THEN 1
                    WHEN 'MARTES'    THEN 2
                    WHEN 'MIERCOLES' THEN 3
                    WHEN 'JUEVES'    THEN 4
                    WHEN 'VIERNES'   THEN 5
                    WHEN 'SABADO'    THEN 6
                    WHEN 'DOMINGO'   THEN 7
                    ELSE 8
                END ASC,
                id_solicitud ASC
        ) AS solicitudes_json
    FROM solicitud_producto
    GROUP BY id_producto
),

mejor_precio AS (
    SELECT DISTINCT ON (pp.id_producto)
        pp.id_producto,
        pp.id_proveedor,
        pp.precio_neto,
        pp.precio_con_iva
    FROM proveedor_producto pp
    JOIN proveedor pv ON pv.id_proveedor = pp.id_proveedor
    WHERE pp.activo = TRUE
      AND pv.activo = TRUE
      AND pv.estado_proveedor = 'DISPONIBLE'
    ORDER BY pp.id_producto, pp.precio_neto ASC
),

proveedor_dias AS (
    SELECT
        pde.id_proveedor,
        jsonb_agg(
            pde.dia_semana::text
            ORDER BY
                CASE pde.dia_semana::text
                    WHEN 'LUNES'     THEN 1
                    WHEN 'MARTES'    THEN 2
                    WHEN 'MIERCOLES' THEN 3
                    WHEN 'JUEVES'    THEN 4
                    WHEN 'VIERNES'   THEN 5
                    WHEN 'SABADO'    THEN 6
                    WHEN 'DOMINGO'   THEN 7
                END ASC
        ) AS dias_entrega_json
    FROM proveedor_dia_entrega pde
    GROUP BY pde.id_proveedor
),

productos_con_proveedor AS (
    SELECT
        ps.id_producto,
        ps.nombre_producto,
        ps.es_fraccionario,
        ps.id_categoria,
        ps.nombre_categoria,
        ps.abreviatura,
        ps.cantidad_total,
        ps.cantidad_por_dia_json,
        spp.solicitudes_json,
        mp.id_proveedor,
        mp.precio_neto,
        mp.precio_con_iva,
        pv.nombre_distribuidora,
        pv.nombre_proveedor,
        pv.telefono_proveedor,
        pv.email_proveedor,
        pd.dias_entrega_json
    FROM productos_solicitados ps
    LEFT JOIN solicitudes_por_producto spp ON spp.id_producto = ps.id_producto
    LEFT JOIN mejor_precio    mp ON mp.id_producto  = ps.id_producto
    LEFT JOIN proveedor       pv ON pv.id_proveedor = mp.id_proveedor
    LEFT JOIN proveedor_dias  pd ON pd.id_proveedor = mp.id_proveedor
)

SELECT jsonb_agg(
    jsonb_build_object(
        'idProveedor',         proveedor_grupo.id_proveedor,
        'nombreDistribuidora', proveedor_grupo.nombre_distribuidora,
        'nombreProveedor',     proveedor_grupo.nombre_proveedor,
        'telefono',            proveedor_grupo.telefono_proveedor,
        'email',               proveedor_grupo.email_proveedor,
        'totalProductos',      proveedor_grupo.total_productos,
        'totalNeto',           proveedor_grupo.total_neto,
        'totalConIva',         proveedor_grupo.total_con_iva,
        'diasEntrega',         proveedor_grupo.dias_entrega_json,
        'categorias',          proveedor_grupo.categorias_json
    )
    ORDER BY
        (proveedor_grupo.id_proveedor IS NULL) ASC,
        proveedor_grupo.nombre_distribuidora ASC
) AS cotizacion_json
FROM (
    SELECT
        categoria_grupo.id_proveedor,
        categoria_grupo.nombre_distribuidora,
        categoria_grupo.nombre_proveedor,
        categoria_grupo.telefono_proveedor,
        categoria_grupo.email_proveedor,
        MAX(categoria_grupo.dias_entrega_json::text)::jsonb AS dias_entrega_json,
        SUM(categoria_grupo.conteo_productos)  AS total_productos,
        SUM(categoria_grupo.subtotal_neto)     AS total_neto,
        SUM(categoria_grupo.subtotal_con_iva)  AS total_con_iva,
        jsonb_agg(
            jsonb_build_object(
                'idCategoria',     categoria_grupo.id_categoria,
                'nombreCategoria', categoria_grupo.nombre_categoria,
                'productos',       categoria_grupo.productos_json
            )
            ORDER BY categoria_grupo.nombre_categoria ASC
        ) AS categorias_json
    FROM (
        SELECT
            pcp.id_proveedor,
            pcp.nombre_distribuidora,
            pcp.nombre_proveedor,
            pcp.telefono_proveedor,
            pcp.email_proveedor,
            pcp.id_categoria,
            pcp.nombre_categoria,
            MAX(pcp.dias_entrega_json::text)::jsonb AS dias_entrega_json,
            COUNT(pcp.id_producto)     AS conteo_productos,
            SUM(CASE WHEN pcp.precio_neto IS NOT NULL
                     THEN ROUND(pcp.precio_neto * pcp.cantidad_total, 2)
                     ELSE 0 END) AS subtotal_neto,
            SUM(CASE WHEN pcp.precio_con_iva IS NOT NULL
                     THEN ROUND(pcp.precio_con_iva * pcp.cantidad_total, 2)
                     ELSE 0 END) AS subtotal_con_iva,
            jsonb_agg(
                jsonb_build_object(
                    'idProducto',      pcp.id_producto,
                    'nombreProducto',  pcp.nombre_producto,
                    'abreviatura',     pcp.abreviatura,
                    'esFraccionario',  pcp.es_fraccionario,
                    'cantidadTotal',   pcp.cantidad_total,
                    'precioNeto',      pcp.precio_neto,
                    'precioConIva',    pcp.precio_con_iva,
                    'cantidadPorDia',  pcp.cantidad_por_dia_json,
                    'solicitudes',     pcp.solicitudes_json
                )
                ORDER BY pcp.nombre_producto ASC
            ) AS productos_json
        FROM productos_con_proveedor pcp
        GROUP BY
            pcp.id_proveedor,
            pcp.nombre_distribuidora,
            pcp.nombre_proveedor,
            pcp.telefono_proveedor,
            pcp.email_proveedor,
            pcp.id_categoria,
            pcp.nombre_categoria
    ) AS categoria_grupo
    GROUP BY
        categoria_grupo.id_proveedor,
        categoria_grupo.nombre_distribuidora,
        categoria_grupo.nombre_proveedor,
        categoria_grupo.telefono_proveedor,
        categoria_grupo.email_proveedor
) AS proveedor_grupo
            """, nativeQuery = true)
    String findCotizacionDeCanceladas(@Param("idsPedido") List<Integer> idsPedido);

    /**
     * Disponible real por producto = (inventario + bodega de tránsito) − demanda comprometida.
     * La demanda comprometida es la suma de {@code cant_producto_solicitud} de las solicitudes
     * EN_PEDIDO ya abastecidas (con línea de OP {@code entregado = true}), identificadas por la
     * puente {@code detalle_orden_pedido_solicitud}. Se resta la demanda REAL (lo que se consumirá),
     * no lo atribuido/pedido.
     *
     * [0] id_producto
     * [1] stock_fisico         (inventario + bodega de tránsito)
     * [2] demanda_comprometida (Σ demanda de solicitudes EN_PEDIDO abastecidas)
     * [3] disponible           (stock_fisico − demanda_comprometida; puede ser negativo = faltante)
     */
    @Query(value = """
        WITH abastecidas AS (
            -- (solicitud, producto) EN_PEDIDO que ya llegaron (entregado = true), vía la puente
            SELECT DISTINCT dops.id_solicitud, dop.id_producto
            FROM detalle_orden_pedido_solicitud dops
            JOIN detalle_orden_pedido dop ON dop.id_detalle_orden_pedido = dops.id_detalle_orden_pedido
            JOIN solicitud s              ON s.id_solicitud              = dops.id_solicitud
            WHERE dops.activo = TRUE
              AND dop.activo  = TRUE
              AND dop.entregado = TRUE
              AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
        ),
        demanda AS (
            SELECT ds.id_producto, SUM(ds.cant_producto_solicitud) AS demanda
            FROM abastecidas a
            JOIN detalle_solicitud ds
              ON ds.id_solicitud = a.id_solicitud AND ds.id_producto = a.id_producto
            GROUP BY ds.id_producto
        ),
        reservas AS (
            -- Stock ya reservado a solicitudes EN_PEDIDO (cubierto con disponible). Al pasar la
            -- solicitud a PROCESADA/RECHAZADA deja de contar por este mismo filtro de estado.
            SELECT r.id_producto, SUM(r.cantidad) AS reservado
            FROM reserva_stock_solicitud r
            JOIN solicitud s ON s.id_solicitud = r.id_solicitud
            WHERE r.activo = TRUE
              AND s.estado_solicitud = 'EN_PEDIDO'::estado_solicitud_type
            GROUP BY r.id_producto
        )
        SELECT
            i.id_producto,                                                                          -- [0]
            COALESCE(i.stock, 0) + COALESCE(bt.stock, 0),                                           -- [1]
            COALESCE(d.demanda, 0) + COALESCE(rv.reservado, 0),                                     -- [2]
            COALESCE(i.stock, 0) + COALESCE(bt.stock, 0)
                - COALESCE(d.demanda, 0) - COALESCE(rv.reservado, 0)                                -- [3]
        FROM inventario i
        LEFT JOIN bodega_transito bt ON bt.id_inventario = i.id_inventario AND bt.activo = TRUE
        LEFT JOIN demanda d          ON d.id_producto    = i.id_producto
        LEFT JOIN reservas rv        ON rv.id_producto   = i.id_producto
        WHERE i.activo = TRUE
          AND i.id_producto IN (:idsProducto)
        """, nativeQuery = true)
    List<Object[]> findDisponibleRealByProductos(@Param("idsProducto") List<Integer> idsProducto);
}
