package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.request.WeeklyFilterForSolicitationDTO;
import KuHub.modules.gestion_academica.dtos.response.YearWithSemestersDTO;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.dtos.YearFilterRequestDTO;
import KuHub.modules.gestion_academica.dtos.request.WeekGeneratorDTO;
import KuHub.modules.gestion_academica.entity.Semana;
import KuHub.modules.gestion_academica.repository.SemanaRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class SemanaServiceImpl implements SemanaService {

    @Autowired
    private SemanaRepository semanaRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    @Override
    public List<Semana> findAllByYear(Short anio) {
        // Si no se envía año, usamos el año actual (2026) como fallback
        Short anioBusqueda = (anio != null) ? anio : (short) java.time.LocalDate.now().getYear();
        return semanaRepository.findByAnioOrderByFechaInicioAsc(anioBusqueda);
    }

    @Transactional(readOnly = true)
    @Override
    public List<Semana> findByWeeklyFilterForSolicitation(WeeklyFilterForSolicitationDTO request){
        return semanaRepository.findByAnioAndSemestreOrderByFechaInicioAsc(request.getAnio(),request.getSemestre());

    }

    @Transactional(readOnly = true)
    @Override
    public List<YearWithSemestersDTO> findGroupedPeriodsAcademic() {
        List<Object[]> rawResults = semanaRepository.findAniosAndSemestresRaw();

        List<YearWithSemestersDTO> responseList = new ArrayList<>();

        for (Object[] row : rawResults) {
            YearWithSemestersDTO dto = new YearWithSemestersDTO();

            Number anioDb = (Number) row[0];
            dto.setAnio(anioDb.shortValue());

            String semestresJson = row[1].toString();

            try {
                // Convertimos el String "[1, 2]" a un List<Short> real
                List<Short> semestresList = objectMapper.readValue(
                        semestresJson,
                        new TypeReference<List<Short>>() {}
                );
                dto.setSemestres(semestresList);
            } catch (Exception e) {
                throw new RuntimeException("Error al mapear el JSON de semestres: " + semestresJson, e);
            }
            // Agregamos el DTO ya armado a la lista final
            responseList.add(dto);
        }
        return responseList;
    }


    @Transactional(readOnly = true)
    @Override
    public List<Short> yearsForFilterWeek() {
        return semanaRepository.findDistinctAniosFromNow();
    }

    /**CREA LAS SEMANAS EJECUTANDO ENVIANDO UNA FECHA LUNES*/
    @Transactional
    @Override
    public boolean generateSemesterCalendar(WeekGeneratorDTO request) {
        // 1. Calculamos el rango total de las 18 semanas
        LocalDate inicioRango = request.getFechaInicio();
        // (cantidadSemanas * 7 días) - 1 para llegar al domingo de la última semana
        LocalDate finRango = inicioRango.plusWeeks(request.getCantidadSemanas()).minusDays(1);

        Short anio = (short) inicioRango.getYear();

        // 2. VALIDACIÓN 1: ¿El semestre ya existe para este año?
        if (semanaRepository.existsBySemestreAndAnio(request.getSemestre(), anio)) {
            throw new GestionAcademicaException("El semestre " + request.getSemestre() +
                    " para el año " + anio + " ya está registrado." , HttpStatus.CONFLICT);
        }

        // 3. VALIDACIÓN 2: ¿Hay alguna fecha de otra semana en este rango? (Traslape)
        if (semanaRepository.existeTraslapeDeFechas(inicioRango, finRango)) {
            throw new GestionAcademicaException("Conflicto de fechas: El rango del " +
                    inicioRango + " al " + finRango + " se cruza con semanas ya existentes.", HttpStatus.CONFLICT);
        }

        // 4. Validación de Lunes
        if (inicioRango.getDayOfWeek().getValue() != 1) {
            throw new GestionAcademicaException("La fecha de inicio debe ser un Lunes." , HttpStatus.BAD_REQUEST);
        }

        // 4. Lógica de generación (tu bucle DO)
        List<Semana> semanasNuevas = new ArrayList<>();
        LocalDate cursor = request.getFechaInicio();

        for (int i = 1; i <= request.getCantidadSemanas(); i++) {
            Semana semana = new Semana();
            semana.setNombreSemana("Semana " + i);
            semana.setFechaInicio(cursor);
            semana.setFechaFin(cursor.plusDays(6));
            semana.setSemestre(request.getSemestre());
            semanasNuevas.add(semana);
            cursor = cursor.plusWeeks(1);
        }

        semanaRepository.saveAll(semanasNuevas);
        return true;
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
