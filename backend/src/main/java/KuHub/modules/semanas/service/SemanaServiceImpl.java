package KuHub.modules.semanas.service;

import KuHub.modules.semanas.dtos.YearFilterRequestDTO;
import KuHub.modules.semanas.entity.Semana;
import KuHub.modules.semanas.repository.SemanaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SemanaServiceImpl implements SemanaService{

    @Autowired
    private SemanaRepository semanaRepository;

    @Transactional(readOnly = true)
    @Override
    public List<Semana> findAll(){
        return semanaRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<Semana> findWeekActiveForYear(YearFilterRequestDTO y){
        // 1. Si el DTO es null o el campo anioFin es null, usamos el año actual
        Integer anioFinal = (y == null || y.getAnioFin() == null)
                ? java.time.LocalDate.now().getYear()
                : y.getAnioFin();

        // 2. Llamada al repositorio con el año garantizado
        return semanaRepository.findWeekActiveForYear(anioFinal);
    }

}
