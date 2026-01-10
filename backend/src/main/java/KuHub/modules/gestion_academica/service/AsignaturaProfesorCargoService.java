package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.entity.AsignaturaProfesorCargo;
import KuHub.modules.gestion_usuario.entity.Usuario;

public interface AsignaturaProfesorCargoService {

    Boolean existsByIdAsignaturaAndIdUsuarioRegistred(Integer asignaturaIdAsignatura, Integer usuarioIdUsuario);
    Usuario findUserByIdAsigntura (Integer idAsignatura);
    AsignaturaProfesorCargo findByAsignaturaProfesorCargoByIdAsignatura(Integer idAsignatura);
}
