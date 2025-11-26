package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.AsignaturaProfesorCargo; 
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AsignaturaProfesorCargoRepository extends JpaRepository <AsignaturaProfesorCargo, Integer> {

    Boolean existsByAsignatura_IdAsignaturaAndUsuario_IdUsuario(Integer asignaturaIdAsignatura, Integer usuarioIdUsuario);
    Optional<AsignaturaProfesorCargo> findByUsuario_ActivoTrueAndAsignatura_IdAsignatura(Integer idAsignatura);
    Optional<AsignaturaProfesorCargo> findByAsignatura_IdAsignatura(Integer idAsignatura);
}
