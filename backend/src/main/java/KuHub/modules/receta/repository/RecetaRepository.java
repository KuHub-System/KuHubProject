package KuHub.modules.receta.repository;

import KuHub.modules.receta.entity.Receta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecetaRepository extends JpaRepository<Receta,Integer> {

    /**
     * Sincroniza manualmente la secuencia de la tabla `receta`.
     *
     * Esta consulta actualiza el valor de la secuencia `receta_id_receta_seq`
     * para que coincida con el valor máximo actualmente existente en la columna `id_receta`.
     *
     * ¿Por qué es necesario?
     * - Cuando se insertan datos manualmente, mediante scripts SQL, importaciones masivas
     *   (COPY) o restauraciones parciales, la secuencia puede quedar desfasada.
     * - Si la secuencia queda con un valor menor al de la tabla, los próximos inserts
     *   producirán claves duplicadas y lanzarán errores de violación de clave primaria.
     *
     * ¿Qué hace exactamente?
     * - Obtiene MAX(id_receta) de la tabla `receta`.
     * - Establece la secuencia para que el próximo `nextval()` continúe desde ese valor.
     *
     * Esto asegura que los próximos registros generen IDs únicos y consecutivos,
     * evitando conflictos con los datos ya existentes.
     */
    @Query(
            value = "SELECT setval('receta_id_receta_seq', (SELECT COALESCE(MAX(id_receta), 1) FROM receta))",
            nativeQuery = true
    )
    Integer syncSeqReceta();

    boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);

    boolean existsById(Integer id);

    Optional<Receta> findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);

    List<Receta> findAllByActivoRecetaTrue();




}
