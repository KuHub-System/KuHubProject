package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtoentity.DocenteSeccionEntityDTO;
import KuHub.modules.gestion_academica.entity.DocenteSeccion;

import java.util.List;

public interface DocenteSeccionService {

    DocenteSeccionEntityDTO findByIdDocenteSeccion(Integer idDocenteSeccion);
    DocenteSeccionEntityDTO findByDocenteAndSeccionResponseDTO(Integer idDocente, Integer idSeccion);
    DocenteSeccion findByDocenteAndSeccionEntity(Integer idDocente, Integer idSeccion);
    DocenteSeccion findByIdSeccionEntity(Integer idSeccion);
    List<DocenteSeccionEntityDTO> findAll ();
    DocenteSeccion save(DocenteSeccion docenteSeccion);
}
