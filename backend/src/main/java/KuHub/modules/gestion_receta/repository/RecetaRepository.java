package KuHub.modules.gestion_receta.repository;

import KuHub.modules.gestion_receta.dtos.projection.CountRecipesAndStatusView;
import KuHub.modules.gestion_receta.dtos.respose.projection.RecipeWithDetailsView;
import KuHub.modules.gestion_receta.entity.Receta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface RecetaRepository extends JpaRepository<Receta,Integer> {

    /** Busca una receta activa por ID. */
    Optional<Receta> findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);

    /** Lista todas las recetas activas sin paginación. */
    List<Receta> findAllByActivoRecetaTrue();

    /** Lista paginada de recetas activas con sus detalles e ingredientes agrupados en JSON. */
    @Query(value = """
        SELECT
            r.id_receta AS "idReceta",
            r.nombre_receta AS "nombreReceta",
            r.descripcion_receta AS "descripcionReceta",
            r.instrucciones AS "instruccionesReceta",
            r.estado_receta::text AS "estadoReceta",
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
        GROUP BY r.id_receta, r.nombre_receta, r.descripcion_receta, r.instrucciones, r.estado_receta
        ORDER BY r.nombre_receta ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<RecipeWithDetailsView> findAllWithDetailsPaging(
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de recetas activas para calcular la paginación. */
    long countByActivoRecetaTrue();

    /** Lista paginada de recetas activas filtradas por nombre o descripción con detalles en JSON. */
    @Query(value = """
        SELECT
            r.id_receta AS "idReceta",
            r.nombre_receta AS "nombreReceta",
            r.descripcion_receta AS "descripcionReceta",
            r.instrucciones AS "instruccionesReceta",
            r.estado_receta::text AS "estadoReceta",
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
        GROUP BY r.id_receta, r.nombre_receta, r.descripcion_receta, r.instrucciones, r.estado_receta
        ORDER BY r.nombre_receta ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<RecipeWithDetailsView> findAllWithDetailsAndSearch(
            @Param("term") String term,
            @Param("limit") int limit,
            @Param("offset") int offset);

    /** Cuenta el total de recetas activas filtradas por búsqueda para calcular la paginación. */
    @Query(value = """
        SELECT COUNT(*) FROM receta 
        WHERE activo = true 
          AND (nombre_receta ILIKE %:term% OR descripcion_receta ILIKE %:term%)
        """, nativeQuery = true)
    long countWithSearch(@Param("term") String term);

    /** Retorna el conteo de recetas agrupado por estado para mostrar en el dashboard. */
    @Query(value = """
        SELECT
            count(*) AS totalReceta,
            COUNT(*) FILTER (WHERE estado_receta = 'ACTIVO') AS total_activos,
            COUNT(*) FILTER (WHERE estado_receta = 'INACTIVO') AS total_inactivos
        FROM receta
        WHERE activo = true
        """, nativeQuery = true)
    CountRecipesAndStatusView countRecipesAndStatus();

    /** Invierte el estado de la receta entre ACTIVO e INACTIVO directamente en BD, retorna filas afectadas. */
    @Modifying
    @Query(value = """
        UPDATE receta 
        SET estado_receta = (
            CASE 
                WHEN estado_receta = 'ACTIVO' THEN 'INACTIVO'::estado_receta_type 
                ELSE 'ACTIVO'::estado_receta_type 
            END
        ) 
        WHERE id_receta = :idReceta
        """, nativeQuery = true)
    int toggleRecipeStatus(@Param("idReceta") Integer idReceta);


    /** Realiza el borrado lógico de una receta por su ID. */
    @Modifying
    @Query("""
       UPDATE Receta r
       SET r.activoReceta = false
       WHERE r.idReceta = :idReceta
       """)
    int softDeleteRecipeById(@Param("idReceta") Integer idReceta);



    // ─── BOOLEANOS ───────────────────────────────────────────────────────────────

    /** Verifica si existe una receta activa con el nombre indicado. */
    boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);
    /** Verifica si existe una receta con el ID indicado. */
    boolean existsById(Integer id);




}
