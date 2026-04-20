package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.request.FilterBlocksByTeacherDTO;
import KuHub.modules.gestion_academica.dtos.request.FilterTimeBlockDTO;
import KuHub.modules.gestion_academica.dtos.request.ReasignarBloqueDTO;
import KuHub.modules.gestion_academica.entity.BloqueHorario;

import java.util.List;

public interface BloqueHorarioService {

    BloqueHorario findById(Integer id);
    BloqueHorario findByNumberBlock (Integer numberBlock);
    List<BloqueHorario> findAll();
    List<BloqueHorario> filterBlocksByNumbersBlocks(List<Integer> numbersBlocksFilter);
    List<BloqueHorario> filterBlocksByDayWeekAndIdRoom(FilterTimeBlockDTO filterTimeBlockDTO);
    List<Integer> getBlockNumbersReservedByTeacher(FilterBlocksByTeacherDTO request);

    List<BloqueHorario> reasignarBloques(List<ReasignarBloqueDTO> bloques);
    List<BloqueHorario> restaurarBloquesDefault();
}
