package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtoentity.SeccionEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.response.SectionAnswerUpdateDTO;
import KuHub.modules.gestion_academica.dtos.request.SectionCreateDTO;
import KuHub.modules.gestion_academica.entity.Seccion;

import java.util.List;

public interface SeccionService {

    boolean createSection (SectionCreateDTO request);





    //SeccionEntityResponseDTO findById(Integer id) ;
    //SeccionEntityResponseDTO findByIdAndActiveIsTrueResponseDTO(Integer id);
    Seccion findByIdAndActiveIsTrueEntity(Integer id);
    //SectionAnswerUpdateDTO findBySectionByIdSeccion(Integer idSeccion);
    //List<SeccionEntityResponseDTO> findAll();
    //List<SeccionEntityResponseDTO> findAllByActivoTrue();
    List<Seccion> findAllSeccionsSeccionList(List<Integer> seccionesIds);
    //SeccionEntityResponseDTO save(Seccion seccion);

    //SectionAnswerUpdateDTO updateSection(SectionAnswerUpdateDTO dto);
    void softDelete(Integer id);
}
