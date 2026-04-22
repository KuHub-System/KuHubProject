package KuHub.modules.gestion_solicitud.repository;

import KuHub.modules.gestion_solicitud.entity.MotivoRechazoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface MotivoRechazoRepository extends JpaRepository<MotivoRechazoSolicitud, Integer> {

    /** Inserta o actualiza el motivo de rechazo de una solicitud (upsert por id_solicitud). */
    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO motivo_rechazo_solicitud (id_solicitud, motivo)
        VALUES (:idSolicitud, :motivo)
        ON CONFLICT (id_solicitud) DO UPDATE
            SET motivo = EXCLUDED.motivo,
                fecha_rechazo = CURRENT_TIMESTAMP
    """, nativeQuery = true)
    void upsertMotivo(@Param("idSolicitud") Integer idSolicitud, @Param("motivo") String motivo);
}
