package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.request.WeeklyFilterForSolicitationDTO;
import KuHub.modules.gestion_academica.dtos.response.YearWithSemestersDTO;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.dtos.request.WeekGeneratorDTO;
import KuHub.modules.gestion_academica.dtos.request.WeekReasignDTO;
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

    /**
     * Reasigna las fechas de las 18 semanas de un período académico existente
     * a partir de una nueva fecha de inicio (debe ser lunes).
     * Mantiene nombre y semestre de cada semana; solo actualiza fechaInicio y fechaFin.
     * ✅ En uso: Consumido por reasignarCalendarioService en semana-service.ts.
     */
    @Transactional
    @Override
    public List<Semana> reasignarSemesterCalendar(WeekReasignDTO request) {
        log.info("Iniciando reasignacion de calendario. Anio: {}, Semestre: {}, NuevaFechaInicio: {}",
                request.getAnio(), request.getSemestre(), request.getNuevaFechaInicio());

        // Validar que la fecha sea lunes
        if (request.getNuevaFechaInicio().getDayOfWeek().getValue() != 1) {
            log.warn("Fecha de inicio no es lunes: {}", request.getNuevaFechaInicio());
            throw new GestionAcademicaException(
                    "La nueva fecha de inicio debe ser un lunes. Fecha recibida: " + request.getNuevaFechaInicio(),
                    HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        // Buscar semanas existentes del período
        List<Semana> semanas = semanaRepository.findByAnioAndSemestreOrderByFechaInicioAsc(
                request.getAnio(), request.getSemestre());

        if (semanas.isEmpty()) {
            log.warn("No se encontraron semanas para anio={} semestre={}", request.getAnio(), request.getSemestre());
            throw new GestionAcademicaException(
                    "No existen semanas registradas para el " + request.getSemestre() +
                    "° semestre del año " + request.getAnio() + ". Genere el calendario primero.",
                    HttpStatus.CONFLICT
            );
        }

        log.info("Se encontraron {} semanas para reasignar.", semanas.size());

        // Recalcular fechas manteniendo el nombre y el semestre
        LocalDate cursor = request.getNuevaFechaInicio();
        for (Semana semana : semanas) {
            log.info("Reasignando '{}': {} -> {} (antes: {} - {})",
                    semana.getNombreSemana(), cursor, cursor.plusDays(6),
                    semana.getFechaInicio(), semana.getFechaFin());
            semana.setFechaInicio(cursor);
            semana.setFechaFin(cursor.plusDays(6));
            cursor = cursor.plusWeeks(1);
        }

        semanaRepository.saveAll(semanas);
        semanaRepository.flush();

        // Retornar el período actualizado ordenado
        List<Semana> resultado = semanaRepository.findByAnioAndSemestreOrderByFechaInicioAsc(
                request.getAnio(), request.getSemestre());
        log.info("Reasignacion completada. {} semanas actualizadas. Nuevo rango: {} - {}",
                resultado.size(),
                resultado.get(0).getFechaInicio(),
                resultado.get(resultado.size() - 1).getFechaFin());
        return resultado;
    }

}
