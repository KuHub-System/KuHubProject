package KuHub.modules.gestion_receta.repository;

import KuHub.modules.gestion_receta.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.gestion_receta.entity.Receta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface RecetaRepository extends JpaRepository<Receta,Integer> {

    /**
     * Consulta para traer receta con detalle, para listar y lo necesario para actualizar, con paginacion.
     * La consulta usa LEFT JOIN para traer datos relacionados de otras tablas, COUNT() para contar los ingredientes de cada
     * receta y jsonb_agg() para agrupar esos ingredientes en un JSON dentro del mismo resultado. Luego GROUP BY agrupa los
     * registros por receta. En Java se usa Map<String, Object> porque el resultado incluye un campo JSON dinámico (detallesJson),
     * y el Map permite recibir esos datos sin necesidad de crear un DTO específico.*/
    @Query(value = """
        SELECT
            r.id_receta AS "idReceta",
            r.nombre_receta AS "nombreReceta",
            r.descripcion_receta AS "descripcionReceta",
            r.activo AS "estado",
            COUNT(d.id_detalle_receta) AS "totalIngredientes",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', p.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetalleReceta', d.id_detalle_receta,
                    'idProducto', p.id_producto,
                    'idUnidad', u.id_unidad
                )
            ) AS "detallesJson"
        FROM receta r
        LEFT JOIN detalle_receta d ON d.id_receta = r.id_receta
        LEFT JOIN producto p ON d.id_producto = p.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE r.activo = true
        GROUP BY r.id_receta, r.nombre_receta, r.descripcion_receta, r.activo
        ORDER BY r.nombre_receta ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<Map<String, Object>> findAllWithDetailsPaging(
            @Param("limit") int limit,
            @Param("offset") int offset);
    /**Contar recetas activas para la paginacion*/
    long countByActivoRecetaTrue();

    /**Permite filtrar recetas por nombre o descripcion para la paginacion*/
    @Query(value = """
        SELECT
            r.id_receta AS "idReceta",
            r.nombre_receta AS "nombreReceta",
            r.descripcion_receta AS "descripcionReceta",
            r.activo AS "estado",
            COUNT(d.id_detalle_receta) AS "totalIngredientes",
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', p.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'idDetalleReceta', d.id_detalle_receta,
                    'idProducto', p.id_producto,
                    'idUnidad', u.id_unidad
                )
            ) AS "detallesJson"
        FROM receta r
        LEFT JOIN detalle_receta d ON d.id_receta = r.id_receta
        LEFT JOIN producto p ON d.id_producto = p.id_producto
        LEFT JOIN unidad_medida u ON u.id_unidad = p.id_unidad
        WHERE r.activo = true 
          AND (r.nombre_receta ILIKE %:term% OR r.descripcion_receta ILIKE %:term%)
        GROUP BY r.id_receta, r.nombre_receta, r.descripcion_receta, r.activo
        ORDER BY r.nombre_receta ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<Map<String, Object>> findAllWithDetailsAndSearch(
            @Param("term") String term,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Contar recetas activas filtradas por búsqueda para la paginación */
    @Query(value = """
        SELECT COUNT(*) FROM receta 
        WHERE activo = true 
          AND (nombre_receta ILIKE %:term% OR descripcion_receta ILIKE %:term%)
        """, nativeQuery = true)
    long countWithSearch(@Param("term") String term);

    /**Contar recetar para listar en el frontend al entrar en la page*/
    @Query(value = """
        SELECT
            count(*) AS totalReceta,
            COUNT(*) FILTER (WHERE estado_receta = 'ACTIVO') AS total_activos,
            COUNT(*) FILTER (WHERE estado_receta = 'INACTIVO') AS total_inactivos
        FROM receta
        WHERE activo = true
        """, nativeQuery = true)
    CountRecipesAndStatusView countRecipesAndStatus();



    /***/

    boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);

    boolean existsById(Integer id);

    Optional<Receta> findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);

    List<Receta> findAllByActivoRecetaTrue();



}
