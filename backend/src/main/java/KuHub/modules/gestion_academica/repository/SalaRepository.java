package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.Sala;
import jdk.dynalink.linker.LinkerServices;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaRepository extends JpaRepository <Sala, Integer> {

    Boolean existsByCodSala(String codSala);
    Boolean existsByNombreSalaAndCodSala(String nombreSala, String codSala);
    List<Sala> findAllByActivoTrue();
    Optional<Sala> findByCodSalaIgnoreCase(String codSala);
    Boolean existsByCodSalaIgnoreCaseAndIdSalaNot(String codSala, Integer idSala);
    Boolean existsByNombreSalaIgnoreCaseAndIdSalaNot(String nombreSala, Integer idSala);

}
