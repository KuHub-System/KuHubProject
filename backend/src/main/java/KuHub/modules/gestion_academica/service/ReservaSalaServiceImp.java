package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.record.CheckAvailability;
import KuHub.modules.gestion_academica.dtos.request.projection.NumberBlockProjection;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.ReservaSalaRepository;
import KuHub.modules.gestion_receta.exceptions.GestionRecetaException;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReservaSalaServiceImp implements ReservaSalaService{

    @Autowired
    private ReservaSalaRepository reservaSalaRepository;

    /**Metodo ultilizado para obtener los */
    @Transactional(readOnly = true)
    @Override
    public List<Integer> findReservedBlocksByIdSalaAndDayWeek(Integer idSala, String diaSemana){
        ReservaSala.DiaSemana enumDia = ReservaSala.DiaSemana.valueOf(diaSemana.toUpperCase());

        return reservaSalaRepository.findDistinctRersevaActivoTrueBySalaIdSalaAndSalaActivoTrueAndDiaSemana
            (idSala, enumDia.name())
                .stream()
                .map(NumberBlockProjection::getBloqueHorarioNumeroBloque)
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public CheckAvailability validatedThatTheBlockIsNotReserved
                (Integer idSala, String diaSemanaRaw, Integer numeroBloque) {

        String key = StringUtils.normalizeToEnumKey(diaSemanaRaw);
        ReservaSala.DiaSemana enumDia;

        try {
            enumDia = ReservaSala.DiaSemana.valueOf(key);
        } catch (IllegalArgumentException | NullPointerException e) {
            // Si el frontend manda algo raro o nulo, lanzamos tu excepción personalizada
            throw new GestionAcademicaException("Día de la semana no válido: " + diaSemanaRaw
                ,HttpStatus.NOT_ACCEPTABLE);
        }

        List<Integer> numbersBlocksReserved = reservaSalaRepository
                .findDistinctRersevaActivoTrueBySalaIdSalaAndSalaActivoTrueAndDiaSemana(idSala, enumDia.name())
                .stream()
                .map(NumberBlockProjection::getBloqueHorarioNumeroBloque)
                .toList();


        boolean disponible = !numbersBlocksReserved.contains(numeroBloque);

        // 4. Retornamos el record con la info procesada
        return new CheckAvailability(disponible, enumDia);
    }











    @Transactional(readOnly = true)
    @Override
    public ReservaSalaEntityResponseDTO findById(Integer id) {
        ReservaSala reservaSala = reservaSalaRepository.findById(id).orElseThrow(
                ()-> new GestionRecetaException("No existe una Reserva Sala del id :"+id+" registrada"
                    , HttpStatus.NOT_FOUND)
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
