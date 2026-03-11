package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.request.SectionCreateDTO;
import KuHub.modules.gestion_academica.dtos.request.SectionUpdateDTO;
import KuHub.modules.gestion_academica.entity.Seccion;

import java.util.List;

public interface SeccionService {
    Seccion findById (Integer idSection);
    boolean createSection (SectionCreateDTO request);
    boolean updateSection (SectionUpdateDTO request);
    boolean softDelete(Integer id);



    //SeccionEntityResponseDTO findById(Integer id) ;
    //SeccionEntityResponseDTO findByIdAndActiveIsTrueResponseDTO(Integer id);
    //Seccion findByIdAndActiveIsTrueEntity(Integer id);
    //SectionAnswerUpdateDTO findBySectionByIdSeccion(Integer idSeccion);
    //List<SeccionEntityResponseDTO> findAll();
    //List<SeccionEntityResponseDTO> findAllByActivoTrue();
    //List<Seccion> findAllSeccionsSeccionList(List<Integer> seccionesIds);
    //SeccionEntityResponseDTO save(Seccion seccion);

    //SectionAnswerUpdateDTO updateSection(SectionAnswerUpdateDTO dto);
}
