package KuHub.modules.gestion_usuario.repository;

import KuHub.modules.gestion_usuario.entity.Modulo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModuloRepository extends JpaRepository<Modulo, Integer> {

    List<Modulo> findByEnabledTrueOrderByOrdenModuloAsc();

    Optional<Modulo> findByCodigoModulo(String codigoModulo);
}
