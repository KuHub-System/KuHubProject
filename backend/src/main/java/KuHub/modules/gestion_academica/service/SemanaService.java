package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.request.WeekGeneratorDTO;
import KuHub.modules.gestion_academica.dtos.request.WeekReasignDTO;
import KuHub.modules.gestion_academica.dtos.request.WeeklyFilterForSolicitationDTO;
import KuHub.modules.gestion_academica.dtos.response.YearWithSemestersDTO;
import KuHub.modules.gestion_academica.entity.Semana;

import java.util.List;

public interface SemanaService {
    List<Semana> findAllByYear(Short anio);
    List<Short> yearsForFilterWeek();
    List<Semana> findByWeeklyFilterForSolicitation(WeeklyFilterForSolicitationDTO request);
    List<YearWithSemestersDTO> findGroupedPeriodsAcademic();
    boolean generateSemesterCalendar(WeekGeneratorDTO request);
    List<Semana> reasignarSemesterCalendar(WeekReasignDTO request);
}
