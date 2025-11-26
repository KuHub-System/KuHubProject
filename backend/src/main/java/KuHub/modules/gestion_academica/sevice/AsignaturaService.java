package KuHub.modules.gestion_academica.sevice;

import KuHub.modules.gestion_academica.dtos.dtomodel.CourseCreateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourseUpdateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourserAnswerDTGOD;
import KuHub.modules.gestion_academica.entity.Asignatura;

import java.util.List;

public interface AsignaturaService {

    Asignatura findById(Integer id);
    Boolean existsByIdAsignatura(Integer id);
    Boolean existsByIdAsignaturaAndTrue(Integer id);
    List<CourserAnswerDTGOD> findAllCourserActiveTrueWithSeccion();
    List<Asignatura> findAll();
    Asignatura save (Asignatura asignatura);
    CourseUpdateDTO updateCourser (CourseUpdateDTO co);
    CourseCreateDTO createCourse (CourseCreateDTO c);
    void softDeleteCourse (Integer id);
}
