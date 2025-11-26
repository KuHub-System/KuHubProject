package KuHub.modules.gestion_academica.sevice;

import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.entity.ReservaSala;

import java.util.List;

public interface ReservaSalaService {

    ReservaSalaEntityResponseDTO findById(Integer id);
    List<ReservaSalaEntityResponseDTO> findAll();
    List<ReservaSala> findAllReserveByIdSeccion(Integer idseccio);
    ReservaSalaEntityResponseDTO save(ReservaSala reservaSala);
    List<Integer> findReservedBlocksByIdSalaAndDayWeek(Integer idSala, String diaSemana);
    Boolean validatedThatTheBlockIsNotReserved(Integer idSala, String diaSemana, Integer numeroBloque);
}
