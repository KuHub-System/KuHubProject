package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.Sala;
import jdk.dynalink.linker.LinkerServices;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalaRepository extends JpaRepository <Sala, Integer> {

    Boolean existsByCodSala(String codSala);
    Boolean existsByNombreSalaAndCodSala(String nombreSala, String codSala);
    List<Sala> findAllByActivoTrue();
}
