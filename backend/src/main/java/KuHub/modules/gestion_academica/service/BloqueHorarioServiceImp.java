package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.request.FilterTimeBlockDTO;
import KuHub.modules.gestion_academica.dtos.request.ReasignarBloqueDTO;
import KuHub.modules.gestion_academica.entity.BloqueHorario;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.BloqueHorarioRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class BloqueHorarioServiceImp implements BloqueHorarioService {

    /**Repositories*/
    @Autowired
    private BloqueHorarioRepository bloqueHorarioRepository;

    /**Services*/
    @Autowired
    private ReservaSalaService reservaSalaService;

    /** Obtiene todos los bloques horarios ordenados por numero_bloque. */
    @Transactional(readOnly = true)
    @Override
    public List<BloqueHorario> findAll() {
        return bloqueHorarioRepository.findAllByOrderByNumeroBloqueAsc();
    }

    /**
     * Filtra los bloques reservados para una sala y dia de la semana especifico
     * y retorna los bloques disponibles.
     */
    @Transactional(readOnly = true)
    @Override
    public List<BloqueHorario> filterBlocksByDayWeekAndIdRoom(FilterTimeBlockDTO request) {
        List<Integer> numbersBlocksFilter = reservaSalaService.findReservedBlocksByIdSalaAndDayWeek(
                request.getIdSala(), request.getDiaSemana());
        return filterBlocksByNumbersBlocks(numbersBlocksFilter);
    }

    /** Filtra bloques horarios excluyendo los numeros indicados. Si la lista es nula/vacia, retorna todos. */
    @Transactional(readOnly = true)
    @Override
    public List<BloqueHorario> filterBlocksByNumbersBlocks(List<Integer> numbersBlocksFilter) {
        if (numbersBlocksFilter == null || numbersBlocksFilter.isEmpty()) {
            return bloqueHorarioRepository.findAllByOrderByNumeroBloqueAsc();
        }
        return bloqueHorarioRepository.findByNumeroBloqueNotInOrderByNumeroBloqueAsc(numbersBlocksFilter);
    }

    /** Busca un bloque horario por su ID. */
    @Transactional(readOnly = true)
    @Override
    public BloqueHorario findById(Integer id) {
        return bloqueHorarioRepository.findById(id).orElseThrow(
                () -> new GestionAcademicaException("El bloque de horario con el id: " + id + " no existe", HttpStatus.NOT_FOUND)
        );
    }

    /** Busca un bloque horario por su numero de bloque. */
    @Transactional(readOnly = true)
    @Override
    public BloqueHorario findByNumberBlock(Integer numberBlock) {
        return bloqueHorarioRepository.findByNumeroBloque(numberBlock).orElseThrow(
                () -> new GestionAcademicaException("El bloque de horario con el numero: " + numberBlock + " no existe", HttpStatus.NOT_FOUND)
        );
    }

    /**
     * Reasigna la lista completa de bloques horarios del sistema.
     * Estrategia: actualiza los bloques existentes (por idBloque o numeroBloque),
     * inserta los nuevos, e intenta eliminar los que ya no figuran en la nueva lista.
     * Valida conflictos de horario entre bloques consecutivos.
     * ✅ En uso: Consumido por reasignarBloquesService en bloque-horario-service.ts.
     */
    @Transactional
    @Override
    public List<BloqueHorario> reasignarBloques(List<ReasignarBloqueDTO> bloques) {
        log.info("Iniciando reasignacion de bloques horarios. Total recibidos: {}", bloques.size());

        if (bloques == null || bloques.isEmpty()) {
            log.warn("Se intento reasignar bloques con lista vacia");
            throw new GestionAcademicaException("La lista de bloques no puede estar vacia", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // Validar que entre bloques consecutivos inicio[n+1] > fin[n]
        validarConflictosHorario(bloques);

        // Obtener mapa de bloques actuales en BD por idBloque
        Map<Integer, BloqueHorario> existentesPorId = bloqueHorarioRepository.findAll()
                .stream().collect(Collectors.toMap(BloqueHorario::getIdBloque, b -> b));

        Set<Integer> idsActualizados = new HashSet<>();

        for (ReasignarBloqueDTO dto : bloques) {
            if (dto.getIdBloque() != null && existentesPorId.containsKey(dto.getIdBloque())) {
                // Actualizar bloque existente
                BloqueHorario existente = existentesPorId.get(dto.getIdBloque());
                existente.setNumeroBloque(dto.getNumeroBloque());
                existente.setHoraInicio(LocalTime.parse(dto.getHoraInicio()));
                existente.setHoraFin(LocalTime.parse(dto.getHoraFin()));
                bloqueHorarioRepository.save(existente);
                idsActualizados.add(dto.getIdBloque());
                log.info("Bloque {} actualizado: {} - {}", dto.getNumeroBloque(), dto.getHoraInicio(), dto.getHoraFin());
            } else {
                // Insertar bloque nuevo
                BloqueHorario nuevo = new BloqueHorario();
                nuevo.setNumeroBloque(dto.getNumeroBloque());
                nuevo.setHoraInicio(LocalTime.parse(dto.getHoraInicio()));
                nuevo.setHoraFin(LocalTime.parse(dto.getHoraFin()));
                bloqueHorarioRepository.save(nuevo);
                log.info("Bloque {} insertado: {} - {}", dto.getNumeroBloque(), dto.getHoraInicio(), dto.getHoraFin());
            }
        }

        // Eliminar bloques que no figuran en la nueva lista (solo los sin referencias FK)
        for (Map.Entry<Integer, BloqueHorario> entry : existentesPorId.entrySet()) {
            if (!idsActualizados.contains(entry.getKey())) {
                try {
                    bloqueHorarioRepository.delete(entry.getValue());
                    bloqueHorarioRepository.flush();
                    log.info("Bloque {} eliminado (no incluido en nueva lista)", entry.getValue().getNumeroBloque());
                } catch (Exception e) {
                    log.warn("No se pudo eliminar el bloque {} (id={}) porque tiene referencias activas. Se mantiene en BD.",
                            entry.getValue().getNumeroBloque(), entry.getKey());
                }
            }
        }

        List<BloqueHorario> resultado = bloqueHorarioRepository.findAllByOrderByNumeroBloqueAsc();
        log.info("Reasignacion completada. Estado final: {} bloques en BD.", resultado.size());
        return resultado;
    }

    /**
     * Restaura los 20 bloques horarios predeterminados del sistema.
     * Actualiza en lugar de eliminar para preservar integridad referencial (FK con reserva_sala).
     * ✅ En uso: Consumido por restaurarBloquesDefaultService en bloque-horario-service.ts.
     */
    @Transactional
    @Override
    public List<BloqueHorario> restaurarBloquesDefault() {
        log.info("Iniciando restauracion de bloques horarios predeterminados...");

        String[][] tiempos = getDefaultTimes();
        List<BloqueHorario> existentes = bloqueHorarioRepository.findAllByOrderByNumeroBloqueAsc();
        Map<Integer, BloqueHorario> existentesPorNumero = existentes.stream()
                .collect(Collectors.toMap(BloqueHorario::getNumeroBloque, b -> b));

        for (int i = 0; i < tiempos.length; i++) {
            int numero = i + 1;
            if (existentesPorNumero.containsKey(numero)) {
                BloqueHorario b = existentesPorNumero.get(numero);
                b.setHoraInicio(LocalTime.parse(tiempos[i][0]));
                b.setHoraFin(LocalTime.parse(tiempos[i][1]));
                bloqueHorarioRepository.save(b);
            } else {
                BloqueHorario b = new BloqueHorario();
                b.setNumeroBloque(numero);
                b.setHoraInicio(LocalTime.parse(tiempos[i][0]));
                b.setHoraFin(LocalTime.parse(tiempos[i][1]));
                bloqueHorarioRepository.save(b);
                log.info("Bloque predeterminado {} creado (no existia en BD)", numero);
            }
        }

        // Eliminar bloques con numero > 20 si no tienen referencias
        for (BloqueHorario extra : existentes) {
            if (extra.getNumeroBloque() > 20) {
                try {
                    bloqueHorarioRepository.delete(extra);
                    bloqueHorarioRepository.flush();
                    log.info("Bloque extra {} eliminado durante restauracion", extra.getNumeroBloque());
                } catch (Exception e) {
                    log.warn("No se pudo eliminar bloque extra {} (referencias activas). Se mantiene.", extra.getNumeroBloque());
                }
            }
        }

        List<BloqueHorario> resultado = bloqueHorarioRepository.findAllByOrderByNumeroBloqueAsc();
        log.info("Restauracion completada. Estado final: {} bloques en BD.", resultado.size());
        return resultado;
    }

    // ── Metodos privados ──

    /** Valida que entre bloques consecutivos inicio[n+1] > fin[n]. */
    private void validarConflictosHorario(List<ReasignarBloqueDTO> bloques) {
        for (int i = 0; i < bloques.size() - 1; i++) {
            LocalTime finActual = LocalTime.parse(bloques.get(i).getHoraFin());
            LocalTime inicioSiguiente = LocalTime.parse(bloques.get(i + 1).getHoraInicio());
            if (!inicioSiguiente.isAfter(finActual)) {
                log.warn("Conflicto de horario: bloque {} (fin: {}) superpone con bloque {} (inicio: {})",
                        bloques.get(i).getNumeroBloque(), finActual,
                        bloques.get(i + 1).getNumeroBloque(), inicioSiguiente);
                throw new GestionAcademicaException(
                        "Conflicto de horario: el bloque " + bloques.get(i + 1).getNumeroBloque() +
                        " inicia antes o al mismo tiempo que termina el bloque " + bloques.get(i).getNumeroBloque(),
                        HttpStatus.UNPROCESSABLE_ENTITY
                );
            }
        }
    }

    /** Retorna los tiempos predeterminados de los 20 bloques del sistema. */
    private String[][] getDefaultTimes() {
        return new String[][]{
            {"08:01", "08:40"}, {"08:41", "09:20"}, {"09:31", "10:10"}, {"10:11", "10:50"},
            {"11:01", "11:40"}, {"11:41", "12:20"}, {"12:31", "13:10"}, {"13:11", "13:50"},
            {"14:01", "14:40"}, {"14:41", "15:20"}, {"15:31", "16:10"}, {"16:11", "16:50"},
            {"17:01", "17:40"}, {"17:41", "18:20"}, {"18:21", "19:00"}, {"19:01", "19:40"},
            {"19:41", "20:20"}, {"20:21", "21:00"}, {"21:01", "21:40"}, {"21:41", "22:10"}
        };
    }

}
