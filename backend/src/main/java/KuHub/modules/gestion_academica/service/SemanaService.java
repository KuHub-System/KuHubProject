package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.YearFilterRequestDTO;
import KuHub.modules.gestion_academica.dtos.request.WeekGeneratorDTO;
import KuHub.modules.gestion_academica.entity.Semana;

import java.util.List;

public interface SemanaService {
    List<Semana> findAllByYear(Short anio);
    List<Short> yearsForFilterWeek();
    boolean generateSemesterCalendar(WeekGeneratorDTO request);
    List<Semana> findWeekActiveForYear(YearFilterRequestDTO y);
}
