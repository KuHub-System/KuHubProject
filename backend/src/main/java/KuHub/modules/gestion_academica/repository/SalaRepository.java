package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.Sala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaRepository extends JpaRepository<Sala, Integer> {

    List<Sala> findAllByActivoTrue();

    Boolean existsByCodSala(String codSala);
    Boolean existsByNombreSalaAndCodSala(String nombreSala, String codSala);

    Optional<Sala> findByCodSalaIgnoreCase(String codSala);
    Boolean existsByCodSalaIgnoreCaseAndIdSalaNot(String codSala, Integer idSala);
    Boolean existsByNombreSalaIgnoreCaseAndIdSalaNot(String nombreSala, Integer idSala);

    /** Verifica si la sala tiene al menos una reserva activa — impide el soft delete. */
    @Query("SELECT COUNT(rs) > 0 FROM ReservaSala rs WHERE rs.sala.idSala = :idSala AND rs.activo = true")
    boolean hasActiveReservas(@Param("idSala") Integer idSala);

}
