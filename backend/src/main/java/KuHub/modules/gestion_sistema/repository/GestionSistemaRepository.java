package KuHub.modules.gestion_sistema.repository;

import KuHub.modules.gestion_sistema.entity.GestionSistema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GestionSistemaRepository extends JpaRepository<GestionSistema, Integer> {
    // id=1 → configuración predeterminada (solo lectura)
    // id=2 → configuración activa (la que se modifica)
}
