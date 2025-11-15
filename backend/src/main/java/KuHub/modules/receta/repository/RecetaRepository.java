package KuHub.modules.receta.repository;

import KuHub.modules.receta.entity.Receta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecetaRepository extends JpaRepository<Receta,Integer> {
    @Query(
            value = "SELECT setval('receta_id_receta_seq', (SELECT COALESCE(MAX(id_receta), 1) FROM receta))",
            nativeQuery = true
    )
    Integer syncSeqReceta();

    boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);

    Optional<Receta> findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);

    List<Receta> findAllByActivoRecetaTrue();


}
