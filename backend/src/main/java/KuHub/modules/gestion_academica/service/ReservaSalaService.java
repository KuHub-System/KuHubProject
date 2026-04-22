package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.record.CheckAvailability;
import KuHub.modules.gestion_academica.dtos.record.ReservaActivaView;
import KuHub.modules.gestion_academica.entity.ReservaSala;

import java.util.List;

public interface ReservaSalaService {

    /** Obtiene todas las reservas activas con datos desnormalizados para la vista de gestión. */
    List<ReservaActivaView> findAllReservasActivas();

    List<Integer> findReservedBlocksByIdSalaAndDayWeek(Integer idSala, String diaSemana);
    List<Integer> findReservedBlocksByTeacherAndDayWeek(Integer idUsuario, String diaSemana);
    CheckAvailability validatedThatTheBlockIsNotReserved
            (Integer idSala, String diaSemanaRaw, Integer numeroBloque);





    ReservaSalaEntityResponseDTO findById(Integer id);
    List<ReservaSalaEntityResponseDTO> findAll();
    List<ReservaSala> findAllReserveByIdSeccion(Integer idseccio);
    ReservaSalaEntityResponseDTO save(ReservaSala reservaSala);

    void deleteReserveById(Integer idReservaSala);
}
