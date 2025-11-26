package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.BloqueHorario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface BloqueHorarioRepository extends JpaRepository <BloqueHorario, Integer> {

    List<BloqueHorario> findByNumeroBloqueNotIn(List<Integer> numbersBlocksFilter);
    Optional<BloqueHorario> findByNumeroBloque(Integer numeroBloque);
}
