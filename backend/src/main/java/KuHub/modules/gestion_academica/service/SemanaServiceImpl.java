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
import java.util.stream.Collectors;

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

        // 1. Anclar en "Semana 1" del período — garantiza que solo tocamos este semestre
        Semana anchor = semanaRepository
                .findByNombreSemanaAndAnioAndSemestre("Semana 1", request.getAnio(), request.getSemestre())
                .orElseThrow(() -> {
                    log.warn("No existe 'Semana 1' para anio={} semestre={}", request.getAnio(), request.getSemestre());
                    return new GestionAcademicaException(
                            "No existen semanas registradas para el " + request.getSemestre() +
                            "° semestre del año " + request.getAnio() + ". Genere el calendario primero.",
                            HttpStatus.CONFLICT
                    );
                });

        log.info("Ancla encontrada: id_semana={}, fechaInicio={}, semestre={}",
                anchor.getIdSemana(), anchor.getFechaInicio(), anchor.getSemestre());

        // 2. Obtener exactamente las 18 semanas de ESTE semestre a partir del id ancla
        //    — filtra por semestre y id >= ancla para no cruzar con otro semestre
        List<Semana> semanas = semanaRepository
                .findBySemestreAndIdSemanaGreaterThanEqualOrderByIdSemanaAsc(
                        request.getSemestre(), anchor.getIdSemana());

        if (semanas.size() > 18) {
            semanas = semanas.subList(0, 18);
        }

        log.info("Semanas a reasignar: {} (semestre={}, id_semana >= {})",
                semanas.size(), request.getSemestre(), anchor.getIdSemana());

        // 3. Validar que el nuevo rango no solape con OTROS períodos (excluir los ids del período actual)
        LocalDate nuevoRangoFin = request.getNuevaFechaInicio().plusWeeks(semanas.size()).minusDays(1);
        List<Integer> idsActuales = semanas.stream().map(Semana::getIdSemana).collect(Collectors.toList());

        if (semanaRepository.existeTraslapeDeFechasExcluyendo(
                request.getNuevaFechaInicio(), nuevoRangoFin, idsActuales)) {
            log.warn("Traslape con otro periodo: rango {} - {} solapa con semanas existentes de otro semestre",
                    request.getNuevaFechaInicio(), nuevoRangoFin);
            throw new GestionAcademicaException(
                    "El nuevo rango de fechas (" + request.getNuevaFechaInicio() + " al " + nuevoRangoFin +
                    ") se cruza con otro período académico ya registrado.",
                    HttpStatus.CONFLICT
            );
        }

        // 4. Calcular las nuevas fechas para cada semana
        List<LocalDate> nuevasFehas = new ArrayList<>();
        for (int i = 0; i < semanas.size(); i++) {
            nuevasFehas.add(request.getNuevaFechaInicio().plusWeeks(i));
        }

        // 5. Determinar el orden de actualización para evitar violaciones de uk_fecha_inicio:
        //    - Moviendo hacia adelante (nueva > actual): actualizar de S18 → S1
        //      (libera las fechas futuras antes de pisarlas con los nuevos valores)
        //    - Moviendo hacia atrás (nueva < actual): actualizar de S1 → S18
        boolean movingForward = request.getNuevaFechaInicio().isAfter(anchor.getFechaInicio());
        log.info("Movimiento {} (ancla actual: {}, nueva: {}). Orden: {}",
                movingForward ? "hacia adelante" : "hacia atrás",
                anchor.getFechaInicio(), request.getNuevaFechaInicio(),
                movingForward ? "S18→S1" : "S1→S18");

        if (movingForward) {
            for (int i = semanas.size() - 1; i >= 0; i--) {
                Semana s = semanas.get(i);
                log.info("Actualizando id={} '{}': {} → {}", s.getIdSemana(), s.getNombreSemana(),
                        s.getFechaInicio(), nuevasFehas.get(i));
                s.setFechaInicio(nuevasFehas.get(i));
                s.setFechaFin(nuevasFehas.get(i).plusDays(6));
                semanaRepository.saveAndFlush(s);
            }
        } else {
            for (int i = 0; i < semanas.size(); i++) {
                Semana s = semanas.get(i);
                log.info("Actualizando id={} '{}': {} → {}", s.getIdSemana(), s.getNombreSemana(),
                        s.getFechaInicio(), nuevasFehas.get(i));
                s.setFechaInicio(nuevasFehas.get(i));
                s.setFechaFin(nuevasFehas.get(i).plusDays(6));
                semanaRepository.saveAndFlush(s);
            }
        }

        // 4. Retornar TODAS las semanas del año de la nueva fecha (no solo el semestre reasignado)
        //    para que el frontend pueda refrescar el estado completo del año sin perder el otro semestre
        Short anioNuevo = (short) request.getNuevaFechaInicio().getYear();
        List<Semana> resultado = semanaRepository.findByAnioOrderByFechaInicioAsc(anioNuevo);
        log.info("Reasignacion completada. Retornando {} semanas del año {}. Rango reasignado: {} - {}",
                resultado.size(), anioNuevo,
                semanas.get(0).getFechaInicio(),
                semanas.get(semanas.size() - 1).getFechaFin());
        return resultado;
    }

}
