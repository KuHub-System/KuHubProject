package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.projection.NumberBlockProjection;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.repository.ReservaSalaRepository;
import KuHub.modules.gestion_receta.exceptions.RecetaException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReservaSalaServiceImp implements ReservaSalaService{

    @Autowired
    private ReservaSalaRepository reservaSalaRepository;


    @Transactional(readOnly = true)
    @Override
    public ReservaSalaEntityResponseDTO findById(Integer id) {
        ReservaSala reservaSala = reservaSalaRepository.findById(id).orElseThrow(
                ()-> new RecetaException("No existe una Reserva Sala del id :"+id+" registrada")
        );
        return covertsDTO(reservaSala);
    }

    @Transactional(readOnly = true)
    @Override
    public List<ReservaSalaEntityResponseDTO> findAll(){
        return reservaSalaRepository.findAll()
                .stream()
                .map(this::covertsDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public List<ReservaSala> findAllReserveByIdSeccion(Integer idseccio){
        return reservaSalaRepository.findBySeccion_IdSeccion(idseccio);
    }

    @Transactional(readOnly = true)
    @Override
    public List<Integer> findReservedBlocksByIdSalaAndDayWeek(Integer idSala, String diaSemana){
        ReservaSala.DiaSemana enumDia = ReservaSala.DiaSemana.valueOf(diaSemana.toUpperCase());

        return reservaSalaRepository.findDistinctBySalaIdSalaAndSalaActivoTrueAndDiaSemana(idSala, enumDia.name())
                .stream()
                .map(NumberBlockProjection::getBloqueHorarioNumeroBloque)
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public Boolean validatedThatTheBlockIsNotReserved(Integer idSala, String diaSemana, Integer numeroBloque){
        ReservaSala.DiaSemana enumDia = ReservaSala.DiaSemana.valueOf(diaSemana.toUpperCase());
        List<Integer> numbersBlocksReserved = reservaSalaRepository.findDistinctBySalaIdSalaAndSalaActivoTrueAndDiaSemana(idSala, enumDia.name())
                .stream()
                .map(NumberBlockProjection::getBloqueHorarioNumeroBloque)
                .toList();

        if (numbersBlocksReserved.contains(numeroBloque)){
            return false;
        }
        return true;
    }

    @Transactional
    @Override
    public ReservaSalaEntityResponseDTO save(ReservaSala reservaSala){
        return covertsDTO(reservaSalaRepository.save(reservaSala));
    }

    @Transactional
    @Override
    public void deleteReserveById(Integer idReservaSala){
        reservaSalaRepository.deleteById(idReservaSala);
    }

    private ReservaSalaEntityResponseDTO covertsDTO(ReservaSala reservaSala){

        return new ReservaSalaEntityResponseDTO(
            reservaSala.getIdReservaSala(),
            reservaSala.getSeccion().getIdSeccion(),
            reservaSala.getSala().getIdSala(),
            reservaSala.getBloqueHorario().getIdBloque(),
            reservaSala.getDiaSemana()
        );
    }

}
