package KuHub.modules.gestion_soporte.repository;

import KuHub.modules.gestion_soporte.entity.SoporteTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SoporteTicketRepository extends JpaRepository<SoporteTicket, Integer> {
}
