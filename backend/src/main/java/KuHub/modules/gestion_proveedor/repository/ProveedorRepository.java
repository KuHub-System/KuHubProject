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
     * Obtiene el detalle completo de un proveedor con sus productos activos e inactivos.
     * Columnas retornadas (Object[]):
     * [0] id_producto
     * [1] id_proveedor_producto
     * [2] nombre_producto
     * [3] nombre_categoria
     * [4] nombre_unidad
     * [5] abreviatura
     * [6] precio_producto
     * [7] activo (de proveedor_producto)
     * [8] fecha_actualizacion
     */
    @Query(value = """
            SELECT
                prod.id_producto,                                        -- [0]
                pp.id_proveedor_producto,                                -- [1]
                prod.nombre_producto,                                    -- [2]
                cat.nombre_categoria,                                    -- [3]
                um.nombre_unidad,                                        -- [4]
                um.abreviatura,                                          -- [5]
                pp.precio_producto,                                      -- [6]
                pp.activo,                                               -- [7]
                pp.fecha_actualizacion                                   -- [8]
            FROM proveedor_producto pp
            INNER JOIN producto prod ON prod.id_producto = pp.id_producto
            INNER JOIN categoria cat ON cat.id_categoria = prod.id_categoria
            INNER JOIN unidad_medida um ON um.id_unidad = prod.id_unidad
            WHERE pp.id_proveedor = :idProveedor
              AND prod.activo = TRUE
            ORDER BY cat.nombre_categoria ASC, prod.nombre_producto ASC
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
     * [7] precio_producto
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
                pp.precio_producto,                                      -- [7]
                pp.fecha_actualizacion                                   -- [8]
            FROM proveedor_producto pp
            INNER JOIN proveedor prov ON prov.id_proveedor = pp.id_proveedor
            WHERE pp.id_producto = :idProducto
              AND pp.activo = TRUE
              AND prov.activo = TRUE
            ORDER BY pp.precio_producto ASC
            """, nativeQuery = true)
    List<Object[]> findProveedoresPorProducto(@Param("idProducto") Integer idProducto);
}
