package KuHub.modules.gestion_academica.sevice;

import KuHub.modules.gestion_academica.entity.AsignaturaProfesorCargo;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.AsignaturaProfesorCargoRepository;
import KuHub.modules.gestionusuario.entity.Usuario;
import KuHub.modules.gestionusuario.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AsignaturaProfesorCargoServiceImp implements AsignaturaProfesorCargoService{

    @Autowired
    private AsignaturaProfesorCargoRepository asignaturaProfesorCargoRepository;

    @Autowired
    private UsuarioService usuarioService;

    @Transactional(readOnly = true)
    @Override
    public Boolean existsByIdAsignaturaAndIdUsuarioRegistred(Integer asignaturaIdAsignatura, Integer usuarioIdUsuario){
        if (asignaturaProfesorCargoRepository.existsByAsignatura_IdAsignaturaAndUsuario_IdUsuario(asignaturaIdAsignatura, usuarioIdUsuario)){
            return true;
        }
        return false;
    }

    @Transactional
    @Override
    public Usuario findUserByIdAsigntura (Integer idAsignatura){

        AsignaturaProfesorCargo asignaturaProfesorCargo = asignaturaProfesorCargoRepository
                .findByUsuario_ActivoTrueAndAsignatura_IdAsignatura(idAsignatura).orElseThrow(
                        ()->new GestionAcademicaException("no existe el usuario registrado para la asignatura")
                );
        return usuarioService.obtenerPorIdEntidad(asignaturaProfesorCargo.getUsuario().getIdUsuario());

    }

    @Transactional(readOnly = true)
    @Override
    public AsignaturaProfesorCargo findByAsignaturaProfesorCargoByIdAsignatura(Integer idAsignatura){
        return asignaturaProfesorCargoRepository.findByAsignatura_IdAsignatura(idAsignatura).orElseThrow(
                ()-> new GestionAcademicaException("No existe la asignatura con el id: " + idAsignatura)
        );
    }

}
