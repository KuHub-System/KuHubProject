package KuHub.modules.semanas.service;

import KuHub.modules.semanas.dtos.YearFilterRequestDTO;
import KuHub.modules.semanas.entity.Semana;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SemanaService {
    List<Semana> findAll();
    List<Semana> findWeekActiveForYear(YearFilterRequestDTO y);
}
