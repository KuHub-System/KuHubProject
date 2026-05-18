package KuHub.modules.gestion_proveedor.repository;

import KuHub.modules.gestion_proveedor.entity.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Integer> {

    // ── 1. Métodos JPA derivados ──

    /** Busca un proveedor activo por su RUT (ignorando mayúsculas). */
    Optional<Proveedor> findByRutProveedorIgnoreCaseAndActivoTrue(String rutProveedor);

    /** Verifica si existe un proveedor con el RUT dado (excluyendo un ID específico para updates). */
    boolean existsByRutProveedorIgnoreCaseAndIdProveedorNot(String rutProveedor, Integer idProveedor);

    /** Verifica si existe un proveedor con el RUT dado. */
    boolean existsByRutProveedorIgnoreCase(String rutProveedor);

    // ── 2. @Query personalizados de solo lectura ──

    /**
     * Lista proveedores activos con cantidad de productos activos asignados.
     * Soporta filtro opcional por estado y búsqueda por nombre/distribuidora/RUT.
     * Columnas retornadas (Object[]):
     * [0] id_proveedor
     * [1] rut_proveedor
     * [2] nombre_distribuidora
     * [3] nombre_proveedor
     * [4] telefono_proveedor
     * [5] email_proveedor
     * [6] estado_proveedor (cast a text)
     * [7] activo
     * [8] fecha_creacion
     * [9] cantidad_productos_activos
     */
    @Query(value = """
            SELECT
                p.id_proveedor,                                          -- [0]
                p.rut_proveedor,                                         -- [1]
                p.nombre_distribuidora,                                  -- [2]
                p.nombre_proveedor,                                      -- [3]
                p.telefono_proveedor,                                    -- [4]
                p.email_proveedor,                                       -- [5]
                CAST(p.estado_proveedor AS TEXT),                        -- [6]
                p.activo,                                                -- [7]
                p.fecha_creacion,                                        -- [8]
                COUNT(pp.id_proveedor_producto) FILTER (WHERE pp.activo = TRUE) AS cantidad_productos_activos -- [9]
            FROM proveedor p
            LEFT JOIN proveedor_producto pp ON pp.id_proveedor = p.id_proveedor
            WHERE p.activo = TRUE
              AND (:estado IS NULL OR CAST(p.estado_proveedor AS TEXT) = :estado)
              AND (:busqueda IS NULL OR :busqueda = ''
                   OR LOWER(p.nombre_distribuidora) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   OR LOWER(p.nombre_proveedor) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   OR LOWER(COALESCE(p.rut_proveedor, '')) LIKE LOWER(CONCAT('%', :busqueda, '%')))
            GROUP BY p.id_proveedor
            ORDER BY p.nombre_distribuidora ASC
            """, nativeQuery = true)
    List<Object[]> findProveedoresConFiltros(
            @Param("estado") String estado,
            @Param("busqueda") String busqueda
    );

    /**
     * Lista proveedores activos con paginación asimétrica (20/10).
     * Soporta filtro opcional por estado y búsqueda por nombre/distribuidora/RUT.
     * Columnas retornadas (Object[]):
     * [0] id_proveedor
     * [1] rut_proveedor
     * [2] nombre_distribuidora
     * [3] nombre_proveedor
     * [4] telefono_proveedor
     * [5] email_proveedor
     * [6] estado_proveedor (cast a text)
     * [7] activo
     * [8] fecha_creacion
     * [9] cantidad_productos_activos
     */
    @Query(value = """
            SELECT
                p.id_proveedor,                                          -- [0]
                p.rut_proveedor,                                         -- [1]
                p.nombre_distribuidora,                                  -- [2]
                p.nombre_proveedor,                                      -- [3]
                p.telefono_proveedor,                                    -- [4]
                p.email_proveedor,                                       -- [5]
                CAST(p.estado_proveedor AS TEXT),                        -- [6]
                p.activo,                                                -- [7]
                p.fecha_creacion,                                        -- [8]
                COUNT(pp.id_proveedor_producto) FILTER (WHERE pp.activo = TRUE) AS cantidad_productos_activos -- [9]
            FROM proveedor p
            LEFT JOIN proveedor_producto pp ON pp.id_proveedor = p.id_proveedor
            WHERE p.activo = TRUE
              AND (:estado IS NULL OR CAST(p.estado_proveedor AS TEXT) = :estado)
              AND (:busqueda IS NULL OR :busqueda = ''
                   OR LOWER(p.nombre_distribuidora) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   OR LOWER(p.nombre_proveedor) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   OR LOWER(COALESCE(p.rut_proveedor, '')) LIKE LOWER(CONCAT('%', :busqueda, '%')))
            GROUP BY p.id_proveedor
            ORDER BY p.nombre_distribuidora ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<Object[]> findProveedoresConFiltrosPaginado(
            @Param("estado") String estado,
            @Param("busqueda") String busqueda,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    /**
     * Cuenta el total de proveedores activos con filtros opcionales.
     */
    @Query(value = """
            SELECT COUNT(DISTINCT p.id_proveedor)
            FROM proveedor p
            WHERE p.activo = TRUE
              AND (:estado IS NULL OR CAST(p.estado_proveedor AS TEXT) = :estado)
              AND (:busqueda IS NULL OR :busqueda = ''
                   OR LOWER(p.nombre_distribuidora) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   OR LOWER(p.nombre_proveedor) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   OR LOWER(COALESCE(p.rut_proveedor, '')) LIKE LOWER(CONCAT('%', :busqueda, '%')))
            """, nativeQuery = true)
    long countProveedoresConFiltros(
            @Param("estado") String estado,
            @Param("busqueda") String busqueda
    );

    /**
     * Obtiene el detalle completo de un proveedor con sus productos activos.
     * Columnas retornadas (Object[]):
     * [0]  id_producto
     * [1]  id_proveedor_producto
     * [2]  nombre_producto
     * [3]  nombre_categoria
     * [4]  nombre_unidad
     * [5]  abreviatura
     * [6]  activo (de proveedor_producto)
     * [7]  fecha_actualizacion
     * [8]  marca_producto
     * [9]  formato_contenido
     * [10] precio_neto
     * [11] precio_con_iva
     */
    @Query(value = """
            SELECT * FROM (
                SELECT DISTINCT ON (pp.id_producto)
                    prod.id_producto             AS id_producto,
                    pp.id_proveedor_producto     AS id_proveedor_producto,
                    prod.nombre_producto         AS nombre_producto,
                    cat.nombre_categoria         AS nombre_categoria,
                    um.nombre_unidad             AS nombre_unidad,
                    um.abreviatura               AS abreviatura,
                    pp.activo                    AS activo,
                    pp.fecha_actualizacion       AS fecha_actualizacion,
                    pp.marca_producto            AS marca_producto,
                    pp.formato_contenido         AS formato_contenido,
                    pp.precio_neto               AS precio_neto,
                    pp.precio_con_iva            AS precio_con_iva
                FROM proveedor_producto pp
                INNER JOIN producto prod ON prod.id_producto = pp.id_producto
                INNER JOIN categoria cat ON cat.id_categoria = prod.id_categoria
                INNER JOIN unidad_medida um ON um.id_unidad = prod.id_unidad
                WHERE pp.id_proveedor = :idProveedor
                  AND prod.activo = TRUE
                ORDER BY pp.id_producto, pp.fecha_actualizacion DESC
            ) ultima_version
            WHERE ultima_version.activo = TRUE
            ORDER BY ultima_version.nombre_categoria ASC, ultima_version.nombre_producto ASC
            """, nativeQuery = true)
    List<Object[]> findProductosPorProveedor(@Param("idProveedor") Integer idProveedor);

    /**
     * Lista todos los proveedores activos que ofrecen un producto específico,
     * útil para comparar precios entre proveedores.
     * Columnas retornadas (Object[]):
     * [0] id_proveedor
     * [1] rut_proveedor
     * [2] nombre_distribuidora
     * [3] nombre_proveedor
     * [4] telefono_proveedor
     * [5] email_proveedor
     * [6] estado_proveedor (cast a text)
     * [7] precio_neto
     * [8] fecha_actualizacion
     */
    @Query(value = """
            SELECT
                prov.id_proveedor,                                       -- [0]
                prov.rut_proveedor,                                      -- [1]
                prov.nombre_distribuidora,                               -- [2]
                prov.nombre_proveedor,                                   -- [3]
                prov.telefono_proveedor,                                 -- [4]
                prov.email_proveedor,                                    -- [5]
                CAST(prov.estado_proveedor AS TEXT),                     -- [6]
                pp.precio_neto,                                          -- [7]
                pp.fecha_actualizacion                                   -- [8]
            FROM proveedor_producto pp
            INNER JOIN proveedor prov ON prov.id_proveedor = pp.id_proveedor
            WHERE pp.id_producto = :idProducto
              AND pp.activo = TRUE
              AND prov.activo = TRUE
            ORDER BY pp.precio_neto ASC
            """, nativeQuery = true)
    List<Object[]> findProveedoresPorProducto(@Param("idProducto") Integer idProducto);

    /**
     * Lista productos disponibles para asignar a un proveedor como JSON.
     * Incluye:
     * - Todos los productos activos que NO están asignados (activo=true) al proveedor
     * - Productos que ESTÁN asignados pero deshabilitados (activo=false) para reactivarlos
     * Retorna JSON array con estructura: { id_producto, nombre_producto, id_categoria, nombre_categoria, id_unidad, nombre_unidad, abreviatura, es_fraccionario }
     */
    @Query(value = """
            SELECT COALESCE(
                json_agg(
                    json_build_object(
                        'id_producto', p.id_producto,
                        'nombre_producto', p.nombre_producto,
                        'id_categoria', c.id_categoria,
                        'nombre_categoria', c.nombre_categoria,
                        'id_unidad', u.id_unidad,
                        'nombre_unidad', u.nombre_unidad,
                        'abreviatura', u.abreviatura,
                        'es_fraccionario', u.es_fraccionario
                    )
                    ORDER BY c.nombre_categoria ASC, p.nombre_producto ASC
                ),
            '[]'::json)
            FROM producto p
            JOIN categoria c ON c.id_categoria = p.id_categoria
            JOIN unidad_medida u ON u.id_unidad = p.id_unidad
            WHERE p.activo = TRUE
              AND (:idCategoria IS NULL OR c.id_categoria = :idCategoria)
              AND NOT EXISTS (
                  SELECT 1
                  FROM proveedor_producto pp
                  WHERE pp.id_producto = p.id_producto
                    AND pp.id_proveedor = :idProveedor
                    AND pp.activo = TRUE
              )
            """, nativeQuery = true)
    String findProductosDisponiblesParaProveedor(
            @Param("idProveedor") Integer idProveedor,
            @Param("idCategoria") Short idCategoria
    );

    /**
     * Cotización agrupada por proveedor (menor precio) con productos ordenados por categoría.
     * Los productos sin proveedor se agrupan al final.
     * Retorna JSON que debe deserializarse a CotizacionProveedorDTO.CotizacionResponse.
     */
    /**
     * Búsqueda global optimizada de productos por nombre, código o descripción.
     * Retorna lista de proveedores con productos agrupados por categoría.
     * La búsqueda es case-insensitive usando ILIKE en PostgreSQL.
     *
     * ✅ OPTIMIZADO (2026-04-28):
     * - Agrupa correctamente por categoría dentro de cada proveedor
     * - Evita truncamiento JSON usando estructura limpia
     * - Incluye fechaActualizacion en cada producto
     * - Una sola categoría por producto (sin duplicados)
     *
     * Retorna JSON array que debe deserializarse a List<BusquedaProductosGlobalDTO>.
     */
    @Query(value = """
            SELECT json_agg(
                json_build_object(
                    'idProveedor', prov.id_proveedor,
                    'rutProveedor', prov.rut_proveedor,
                    'nombreDistribuidora', prov.nombre_distribuidora,
                    'nombreProveedor', prov.nombre_proveedor,
                    'emailProveedor', prov.email_proveedor,
                    'telefonoProveedor', prov.telefono_proveedor,
                    'estadoProveedor', CAST(prov.estado_proveedor AS TEXT),
                    'cantidadProductosActivos', (
                        SELECT COUNT(*)
                        FROM proveedor_producto pp_count
                        WHERE pp_count.id_proveedor = prov.id_proveedor
                          AND pp_count.activo = TRUE
                    ),
                    'categorias', COALESCE(
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'nombreCategoria', cat_group.nombre_categoria,
                                    'productos', cat_group.productos
                                ) ORDER BY cat_group.nombre_categoria ASC
                            )
                            FROM (
                                SELECT
                                    COALESCE(c.nombre_categoria, 'Sin Categoría') AS nombre_categoria,
                                    json_agg(
                                        json_build_object(
                                            'idProducto',           p.id_producto,
                                            'idProveedorProducto',  pp.id_proveedor_producto,
                                            'nombreProducto',       p.nombre_producto,
                                            'codProducto',          p.cod_producto,
                                            'nombreUnidad',         u.nombre_unidad,
                                            'abreviatura',          u.abreviatura,
                                            'formatoContenido',     pp.formato_contenido,
                                            'precioNeto',           pp.precio_neto,
                                            'precioConIva',         pp.precio_con_iva,
                                            'activo',               pp.activo,
                                            'fechaActualizacion',   pp.fecha_actualizacion
                                        ) ORDER BY p.nombre_producto ASC
                                    ) AS productos
                                FROM proveedor_producto pp
                                INNER JOIN producto p        ON pp.id_producto   = p.id_producto
                                INNER JOIN categoria c       ON p.id_categoria   = c.id_categoria
                                INNER JOIN unidad_medida u   ON p.id_unidad      = u.id_unidad
                                WHERE pp.id_proveedor = prov.id_proveedor
                                  AND p.activo = TRUE
                                  AND (
                                      p.nombre_producto      ILIKE :searchTerm OR
                                      p.cod_producto         ILIKE :searchTerm OR
                                      p.descripcion_producto ILIKE :searchTerm
                                  )
                                GROUP BY c.nombre_categoria
                            ) cat_group
                        ),
                        '[]'::json
                    )
                )
            ) AS proveedores_json
            FROM (
                SELECT DISTINCT
                    prov.id_proveedor,
                    prov.rut_proveedor,
                    prov.nombre_distribuidora,
                    prov.nombre_proveedor,
                    prov.email_proveedor,
                    prov.telefono_proveedor,
                    prov.estado_proveedor
                FROM proveedor prov
                WHERE prov.activo = TRUE
                  AND EXISTS (
                      SELECT 1
                      FROM proveedor_producto pp
                      INNER JOIN producto p ON pp.id_producto = p.id_producto
                      WHERE pp.id_proveedor = prov.id_proveedor
                        AND p.activo = TRUE
                        AND (
                            p.nombre_producto      ILIKE :searchTerm OR
                            p.cod_producto         ILIKE :searchTerm OR
                            p.descripcion_producto ILIKE :searchTerm
                        )
                  )
            ) prov
            """, nativeQuery = true)
    String buscarProductosGlobal(@Param("searchTerm") String searchTerm);

    @Query(value = """
WITH
productos_solicitados AS (
    SELECT
        p.id_producto,
        p.nombre_producto,
        c.id_categoria,
        c.nombre_categoria,
        um.abreviatura,
        SUM(ds.cant_producto_solicitud) AS cantidad_total
    FROM detalle_solicitud ds
    JOIN solicitud s ON s.id_solicitud = ds.id_solicitud
    JOIN producto p ON p.id_producto = ds.id_producto
    JOIN categoria c ON c.id_categoria = p.id_categoria
    JOIN unidad_medida um ON um.id_unidad = p.id_unidad
    WHERE s.estado_solicitud = 'EN_PEDIDO'
      AND s.fecha_solicitada BETWEEN :fechaInicio AND :fechaFin
    GROUP BY
        p.id_producto,
        p.nombre_producto,
        c.id_categoria,
        c.nombre_categoria,
        um.abreviatura
),

mejor_precio AS (
    SELECT DISTINCT ON (pp.id_producto)
        pp.id_producto,
        pp.id_proveedor,
        pp.precio_neto
    FROM proveedor_producto pp
    JOIN proveedor pv ON pv.id_proveedor = pp.id_proveedor
    WHERE pp.activo = TRUE
      AND pv.activo = TRUE
      AND pv.estado_proveedor = 'DISPONIBLE'
    ORDER BY
        pp.id_producto,
        pp.precio_neto ASC
),

productos_con_proveedor AS (
    SELECT
        ps.id_producto,
        ps.nombre_producto,
        ps.id_categoria,
        ps.nombre_categoria,
        ps.abreviatura,
        ps.cantidad_total,
        mp.id_proveedor,
        mp.precio_neto,
        pv.nombre_distribuidora,
        pv.nombre_proveedor,
        pv.telefono_proveedor,
        pv.email_proveedor
    FROM productos_solicitados ps
    LEFT JOIN mejor_precio mp ON mp.id_producto = ps.id_producto
    LEFT JOIN proveedor pv ON pv.id_proveedor = mp.id_proveedor
)

SELECT jsonb_agg(
    jsonb_build_object(
        'idProveedor',         proveedor_grupo.id_proveedor,
        'nombreDistribuidora', proveedor_grupo.nombre_distribuidora,
        'nombreProveedor',     proveedor_grupo.nombre_proveedor,
        'telefono',            proveedor_grupo.telefono_proveedor,
        'email',               proveedor_grupo.email_proveedor,
        'totalProductos',      proveedor_grupo.total_productos,
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
        SUM(categoria_grupo.conteo_productos) AS total_productos,
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
            COUNT(pcp.id_producto) AS conteo_productos,
            jsonb_agg(
                jsonb_build_object(
                    'idProducto',      pcp.id_producto,
                    'nombreProducto',  pcp.nombre_producto,
                    'abreviatura',     pcp.abreviatura,
                    'cantidadTotal',   pcp.cantidad_total,
                    'precioUnitario',  pcp.precio_neto,
                    'subtotal',        CASE
                                           WHEN pcp.precio_neto IS NOT NULL
                                           THEN ROUND(pcp.precio_neto * pcp.cantidad_total, 2)
                                           ELSE NULL
                                       END
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
    String findCotizacionProveedoresPorRango(
            @Param("fechaInicio") java.time.LocalDate fechaInicio,
            @Param("fechaFin") java.time.LocalDate fechaFin
    );
}
