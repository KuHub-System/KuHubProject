package KuHub.modules.gestion_solicitud.repository;

import KuHub.modules.gestion_solicitud.entity.MotivoRechazoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MotivoRechazoRepository extends JpaRepository<MotivoRechazoSolicitud, Integer> {
}
