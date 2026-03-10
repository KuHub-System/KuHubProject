package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtomodel.CourseCreateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourseSolicitationResponseDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourseUpdateDTO;
import KuHub.modules.gestion_academica.dtos.response.CourserPageDTGOD;
import KuHub.modules.gestion_academica.entity.Asignatura;

import java.util.List;

public interface AsignaturaService {

    CourserPageDTGOD findAllCourserActiveTrueWithSeccion(Integer pageRequested);
    boolean createCourse (CourseCreateDTO request);





    Asignatura findById(Integer id);
    Boolean existsByIdAsignatura(Integer id);
    Boolean existsByIdAsignaturaAndTrue(Integer id);

    List<CourseSolicitationResponseDTO> findCourserForSolicitation();
    List<Asignatura> findAll();
    Asignatura save (Asignatura asignatura);
    CourseUpdateDTO updateCourser (CourseUpdateDTO co);

    void softDeleteCourse (Integer id);
}
