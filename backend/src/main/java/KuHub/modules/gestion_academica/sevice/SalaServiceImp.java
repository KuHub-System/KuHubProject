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


    @Transactional
    @Override
    public Sala updateRoom( Sala s) {

        // Buscar la sala existente
        Sala salaExistente = salaRepository.findById(s.getIdSala())
                .orElseThrow(() -> new GestionAcademicaException("La sala con id: " + s.getIdSala() + " no existe"));

        // Normalizar código solo si no es null
        String parsearCod = s.getCodSala() != null
                ? StringUtils.normalizeSpaces(s.getCodSala())
                : null;

        // Normalizar nombre solo si no es null
        String parsearNombre = s.getNombreSala() != null
                ? StringUtils.normalizeSpaces(s.getNombreSala())
                : null;

        // Validación de código duplicado (ignorando la sala actual)
        if (parsearCod != null) {
            if (salaRepository.existsByCodSalaIgnoreCaseAndIdSalaNot(parsearCod, s.getIdSala())) {
                throw new GestionAcademicaException("Ya existe otra sala con el código: " + s.getCodSala());
            }
        }

        // Validación de nombre duplicado (ignorando la sala actual)
        if (parsearNombre != null) {
            if (salaRepository.existsByNombreSalaIgnoreCaseAndIdSalaNot(parsearNombre, s.getIdSala())) {
                throw new GestionAcademicaException("Ya existe otra sala con el nombre: " + s.getNombreSala());
            }
        }

        // Actualizar solo los campos que no son null
        if (parsearCod != null) {
            salaExistente.setCodSala(parsearCod);
        }

        if (parsearNombre != null) {
            salaExistente.setNombreSala(parsearNombre);
        }

        // Siempre mantener activo en true en actualizaciones
        salaExistente.setActivo(true);

        return salaRepository.save(salaExistente);
    }

    @Transactional
    @Override
    public void softDelete(Integer id) {
        Sala sala = findById(id);
        sala.setActivo(false);
        salaRepository.save(sala);
    }


}
