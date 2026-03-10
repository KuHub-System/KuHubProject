package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.request.FilterTimeBlockDTO;
import KuHub.modules.gestion_academica.entity.BloqueHorario;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.BloqueHorarioRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class BloqueHorarioServiceImp implements BloqueHorarioService{

    @Autowired
    private BloqueHorarioRepository bloqueHorarioRepository;

    @Autowired
    private ReservaSalaService reservaSalaService;

    /**Metodos par obtener todas los bloques de horari ordenado por numero de bloque*/
    @Transactional(readOnly = true)
    @Override
    public List<BloqueHorario> findAll() {
        return bloqueHorarioRepository.findAllByOrderByNumeroBloqueAsc();
    }

    /**Metodo para obtner los ids de bloque que ya esta reservados para una id_sala y dia de la semana espeficico
     * con esos ids se puede omitirlos para mostrar los horarios disponibles*/
    @Transactional(readOnly = true)
    @Override
    public List<BloqueHorario> filterBlocksByDayWeekAndIdRoom(FilterTimeBlockDTO request){
        List<Integer> numbersBlocksFilter = reservaSalaService.findReservedBlocksByIdSalaAndDayWeek(
                request.getIdSala(), request.getDiaSemana());
        return filterBlocksByNumbersBlocks(numbersBlocksFilter);
    }

    /**Metodo para obtener los bloques de horarios filtrados por ids de bloques reservados para una id_sala y dia
     * de la semana espeficico, si no hay reserva retorna el bloque completo*/
    @Transactional
    @Override
    public List<BloqueHorario> filterBlocksByNumbersBlocks(List<Integer> numbersBlocksFilter){
        if (numbersBlocksFilter == null || numbersBlocksFilter.isEmpty()) {
            return bloqueHorarioRepository.findAll();
        }
        return bloqueHorarioRepository.findByNumeroBloqueNotIn(numbersBlocksFilter);
    }







    @Transactional(readOnly = true)
    @Override
    public BloqueHorario findById(Integer id) {
        return bloqueHorarioRepository.findById(id).orElseThrow(
                ()-> new GestionAcademicaException("El bloque de horario con el id: " + id + " no existe", HttpStatus.NOT_FOUND)
        );
    }

    @Transactional(readOnly = true)
    @Override
    public BloqueHorario findByNumberBlock (Integer numberBlock){
        return bloqueHorarioRepository.findByNumeroBloque(numberBlock).orElseThrow(
                ()-> new GestionAcademicaException("El bloque de horario con el numero: " + numberBlock + " no existe", HttpStatus.NOT_FOUND)
        );
    }










}
