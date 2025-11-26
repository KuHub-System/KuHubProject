package KuHub.modules.gestion_academica.sevice;

import KuHub.modules.gestion_academica.dtos.dtoentity.DocenteSeccionEntityDTO;
import KuHub.modules.gestion_academica.entity.DocenteSeccion;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.DocenteSeccionRepository;
import KuHub.modules.gestionusuario.dtos.UsuarioResponseDTO;
import KuHub.modules.gestionusuario.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;


@Service
public class DocenteSeccionServiceImp implements DocenteSeccionService{

    @Autowired
    private DocenteSeccionRepository docenteSeccionRepository;

    @Autowired
    private UsuarioService usuarioService;

    @Transactional(readOnly = true)
    @Override
    public DocenteSeccionEntityDTO findByIdDocenteSeccion (Integer idDocenteSeccion){
        DocenteSeccion docenteSeccion = docenteSeccionRepository.findById(idDocenteSeccion)
                .orElseThrow(() -> new GestionAcademicaException("No existe una DocenteSeccion del id : "+idDocenteSeccion+" registrada")
        );
        return covertsDTO(docenteSeccion);
    }

    @Transactional(readOnly = true)
    @Override
    public DocenteSeccionEntityDTO findByDocenteAndSeccionResponseDTO(Integer idDocente, Integer idSeccion){
        DocenteSeccion docenteSeccion = docenteSeccionRepository.findByUsuario_IdUsuarioAndSeccion_IdSeccion(
                idDocente, idSeccion
            ).orElseThrow(() -> new GestionAcademicaException("No existe una DocenteSeccion del id docente : "+idDocente
                                                            +" y id seccion "+idSeccion+" registrada")
            );
        return covertsDTO(docenteSeccion);
    }

    @Transactional(readOnly = true)
    @Override
    public DocenteSeccion findByDocenteAndSeccionEntity(Integer idDocente, Integer idSeccion){
        return docenteSeccionRepository.findByUsuario_IdUsuarioAndSeccion_IdSeccion(idDocente, idSeccion)
                .orElseThrow(() -> new GestionAcademicaException("No existe una DocenteSeccion del id docente : "+idDocente
                                                            +" y id seccion "+idSeccion+" registrada")
        );
    }

    @Transactional(readOnly = true)
    @Override
    public DocenteSeccion findByIdSeccionEntity(Integer idSeccion){
        return docenteSeccionRepository.findBySeccion_IdSeccion(idSeccion)
                .orElseThrow(() -> new GestionAcademicaException("No existe una DocenteSeccion del id seccion : "+idSeccion+" registrada")
        );
    }



    @Transactional(readOnly = true)
    @Override
    public List<DocenteSeccionEntityDTO> findAll (){
        return docenteSeccionRepository.findAll()
                .stream()
                .map(this::covertsDTO)
                .toList();
    }

    //save sin restricciones, debido que se crea en createSection NO ALTERAR!!!
    @Transactional
    @Override
    public DocenteSeccion save(DocenteSeccion docenteSeccion){
        return docenteSeccionRepository.save(docenteSeccion);
    }


    private DocenteSeccionEntityDTO covertsDTO(DocenteSeccion docenteSeccion){
        UsuarioResponseDTO U = usuarioService.convertirADTO(docenteSeccion.getUsuario());
        return new DocenteSeccionEntityDTO(
                docenteSeccion.getIdDocenteSeccion(),
                docenteSeccion.getSeccion().getIdSeccion(),
                docenteSeccion.getSeccion().getNombreSeccion(),
                docenteSeccion.getUsuario().getIdUsuario(),
                usuarioService.obtenerNombreCompleto(U),
                docenteSeccion.getFechaAsignacion()
        );
    }
}
