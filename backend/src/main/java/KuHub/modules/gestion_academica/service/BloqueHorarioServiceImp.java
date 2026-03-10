package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtomodel.FilterTimeBlockRequestDTO;
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


    @Transactional(readOnly = true)
    @Override
    public List<BloqueHorario> findAll() {
        return bloqueHorarioRepository.findAllByOrderByNumeroBloqueAsc();//lo que manda es el numero del bloque
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
    public List<BloqueHorario> filterBlocksByDayWeekAndIdRoom(FilterTimeBlockRequestDTO f){

        List<Integer> numbersBlocksFilter = reservaSalaService.findReservedBlocksByIdSalaAndDayWeek(f.getIdSala(), f.getDiaSemana());
        return filterBlocksByNumbersBlocks(numbersBlocksFilter);
    }




}
