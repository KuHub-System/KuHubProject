package KuHub.modules.gestion_academica.service;

import KuHub.modules.gestion_academica.entity.Sala;

import java.util.List;

public interface SalaService {
    List<Sala> findAllActiveRoomsTrue ();





    Sala findById(Integer id);
    List<Sala> findAll();

    Boolean existsByCodSala(String codSala);
    Sala save (Sala sala);
    void softDelete(Integer id);
    Sala updateRoom( Sala salaActualizada);
}
