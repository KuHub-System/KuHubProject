package KuHub.modules.gestion_orden_pedido.repository;

import KuHub.modules.gestion_orden_pedido.entity.OrdenPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

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
     * Lista pedidos APROBADO dentro de un rango de fechas con CONTADOR de OPs activas.
     * El front decide chips según cantidad: 0 → "Sin OP" | 1 → "OP Generada" |
     * ≥2 → "Ya existe un registro para este pedido" (no bloquea selección).
     * [0] id_pedido               (Integer)
     * [1] fecha_inicio_pedido     (Date)
     * [2] fecha_fin_pedido        (Date)
     * [3] estado_pedido           (String)
     * [4] cantidad_orden_pedido   (Long)
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
            ) AS cantidad_orden_pedido                                              -- [4]
        FROM pedido p
        WHERE p.estado_pedido = 'APROBADO'
          AND p.fecha_inicio_pedido >= :fechaInicio
          AND p.fecha_fin_pedido    <= :fechaFin
        ORDER BY p.fecha_inicio_pedido ASC
        """, nativeQuery = true)
    List<Object[]> findPedidosSemanaConIndicadorOP(
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin")    LocalDate fechaFin);

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
        mp.id_proveedor,
        mp.precio_neto,
        mp.precio_con_iva,
        pv.nombre_distribuidora,
        pv.nombre_proveedor,
        pv.telefono_proveedor,
        pv.email_proveedor,
        pd.dias_entrega_json
    FROM productos_solicitados ps
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
                    'cantidadPorDia',  pcp.cantidad_por_dia_json
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
}
