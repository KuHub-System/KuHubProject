package KuHub.modules.gestion_academica.repository;

import KuHub.modules.gestion_academica.entity.DocenteSeccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocenteSeccionRepository extends JpaRepository <DocenteSeccion, Integer>{

    Optional<DocenteSeccion> findByUsuario_IdUsuarioAndSeccion_IdSeccion(Integer docenteIdDocente, Integer seccionIdSeccion);
    Optional<DocenteSeccion> findBySeccion_IdSeccion(Integer idSeccion);
}
