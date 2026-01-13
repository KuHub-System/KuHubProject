package KuHub.modules.gestion_receta.repository;

import KuHub.modules.gestion_receta.entity.Receta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecetaRepository extends JpaRepository<Receta,Integer> {


    boolean existsByNombreRecetaAndActivoRecetaTrue(String nombreReceta);

    boolean existsById(Integer id);

    Optional<Receta> findByIdRecetaAndActivoRecetaIsTrue(Integer idReceta);

    List<Receta> findAllByActivoRecetaTrue();



}
