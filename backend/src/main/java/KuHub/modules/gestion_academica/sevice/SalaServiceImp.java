package KuHub.modules.gestion_academica.sevice;

import KuHub.modules.gestion_academica.entity.Sala;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.repository.SalaRepository;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SalaServiceImp implements SalaService {

    @Autowired
    private SalaRepository salaRepository;

    @Transactional(readOnly = true)
    @Override
    public Sala findById(Integer id) {
        return salaRepository.findById(id).orElseThrow(
                () -> new GestionAcademicaException("La sala con el id: " + id + " no existe")
        );
    }

    @Transactional(readOnly = true)
    @Override
    public List<Sala> findAll() {
        return salaRepository.findAll();
    }

    @Transactional(readOnly = true)
    @Override
    public List<Sala> findAllActiveRoomsTrue (){
        return salaRepository.findAllByActivoTrue();
    }

    @Transactional(readOnly = true)
    @Override
    public Boolean existsByCodSala(String codSala) {
        return salaRepository.existsByCodSala(codSala);
    }


    @Transactional
    @Override
    public Sala save(Sala sala) {

        // Normalizar código solo si no es null
        String parsearCod = sala.getCodSala() != null
                ? StringUtils.normalizeSpaces(sala.getCodSala())
                : null;

        // Normalizar nombre solo si no es null
        String parsearNombre = sala.getNombreSala() != null
                ? StringUtils.normalizeSpaces(sala.getNombreSala())
                : null;

        // Validación: si codSala no es null -> revisa duplicado
        if (parsearCod != null && salaRepository.existsByCodSala(parsearCod)) {
            throw new GestionAcademicaException("Ya existe una sala con el código: " + sala.getCodSala());
        }

        // Validación combinada solo si ambas no son null
        if (parsearCod != null &&
                parsearNombre != null &&
                salaRepository.existsByNombreSalaAndCodSala(parsearNombre, parsearCod)) {

            throw new GestionAcademicaException("Ya existe una sala con el nombre: "
                    + sala.getNombreSala() + " y el código: " + sala.getCodSala());
        }

        sala.setNombreSala(parsearNombre);
        sala.setCodSala(parsearCod);
        sala.setActivo(true);

        return salaRepository.save(sala);
    }

    //falta actualizar datos entity...

    @Transactional
    @Override
    public void softDelete(Integer id) {
        Sala sala = findById(id);
        sala.setActivo(false);
        salaRepository.save(sala);
    }


}
