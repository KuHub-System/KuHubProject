package KuHub.modules.gestion_academica.sevice;

import KuHub.modules.gestion_academica.dtos.dtomodel.FilterTimeBlockRequestDTO;
import KuHub.modules.gestion_academica.entity.BloqueHorario;

import java.util.List;

public interface BloqueHorarioService {

    BloqueHorario findById(Integer id);
    BloqueHorario findByNumberBlock (Integer numberBlock);
    List<BloqueHorario> findAll();
    List<BloqueHorario> filterBlocksByNumbersBlocks(List<Integer> numbersBlocksFilter);
    List<BloqueHorario> filterBlocksByDayWeekAndIdRoom(FilterTimeBlockRequestDTO filterTimeBlockRequestDTO);
}
