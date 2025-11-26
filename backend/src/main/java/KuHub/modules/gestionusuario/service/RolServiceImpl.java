package KuHub.modules.gestionusuario.service;

import KuHub.modules.gestionusuario.dtos.RolRequestDTO;
import KuHub.modules.gestionusuario.dtos.RolResponseDTO;
import KuHub.modules.gestionusuario.entity.Rol;
import KuHub.modules.gestionusuario.exceptions.RolNotFoundException;
import KuHub.modules.gestionusuario.repository.RolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementación del servicio de Roles
 */
@Service
public class RolServiceImpl implements RolService {

    @Autowired
    private RolRepository rolRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RolResponseDTO> obtenerTodos() {
        return rolRepository.findAllByOrderByNombreRolAsc()
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RolResponseDTO> obtenerActivos() {
        return rolRepository.findByActivoTrue()
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RolResponseDTO obtenerPorId(Integer idRol) {
        Rol rol = rolRepository.findById(idRol)
                .orElseThrow(() -> new RolNotFoundException(idRol));
        return convertirADTO(rol);
    }

    @Override
    @Transactional(readOnly = true)
    public Rol obtenerEntityPorId(Integer idRol){
        return rolRepository.findById(idRol).orElseThrow(() -> new RolNotFoundException(idRol));
    }

    @Override
    @Transactional(readOnly = true)
    public RolResponseDTO obtenerPorNombre(String nombreRol) {
        Rol rol = rolRepository.findByNombreRolIgnoreCase(nombreRol)
                .orElseThrow(() -> new RolNotFoundException("nombre", nombreRol));
        return convertirADTO(rol);
    }

    @Override
    @Transactional
    public RolResponseDTO crear(RolRequestDTO rolRequestDTO) {
        // Validar que no exista un rol con ese nombre
        if (rolRepository.existsByNombreRol(rolRequestDTO.getNombreRol())) {
            throw new IllegalArgumentException("Ya existe un rol con el nombre '" + rolRequestDTO.getNombreRol() + "'");
        }

        Rol rol = new Rol();
        rol.setNombreRol(rolRequestDTO.getNombreRol());
        rol.setActivo(rolRequestDTO.getActivo() != null ? rolRequestDTO.getActivo() : true);

        Rol rolGuardado = rolRepository.save(rol);
        return convertirADTO(rolGuardado);
    }

    @Override
    @Transactional
    public RolResponseDTO actualizar(Integer idRol, RolRequestDTO rolRequestDTO) {
        Rol rol = rolRepository.findById(idRol)
                .orElseThrow(() -> new RolNotFoundException(idRol));

        // Validar que no exista otro rol con ese nombre
        rolRepository.findByNombreRol(rolRequestDTO.getNombreRol())
                .ifPresent(rolExistente -> {
                    if (!rolExistente.getIdRol().equals(idRol)) {
                        throw new IllegalArgumentException("Ya existe otro rol con el nombre '" + rolRequestDTO.getNombreRol() + "'");
                    }
                });

        rol.setNombreRol(rolRequestDTO.getNombreRol());
        if (rolRequestDTO.getActivo() != null) {
            rol.setActivo(rolRequestDTO.getActivo());
        }

        Rol rolActualizado = rolRepository.save(rol);
        return convertirADTO(rolActualizado);
    }

    @Override
    @Transactional
    public void desactivar(Integer idRol) {
        Rol rol = rolRepository.findById(idRol)
                .orElseThrow(() -> new RolNotFoundException(idRol));
        rol.setActivo(false);
        rolRepository.save(rol);
    }

    @Override
    @Transactional
    public void activar(Integer idRol) {
        Rol rol = rolRepository.findById(idRol)
                .orElseThrow(() -> new RolNotFoundException(idRol));
        rol.setActivo(true);
        rolRepository.save(rol);
    }

    @Override
    @Transactional
    public void eliminar(Integer idRol) {
        if (!rolRepository.existsById(idRol)) {
            throw new RolNotFoundException(idRol);
        }
        rolRepository.deleteById(idRol);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existePorNombre(String nombreRol) {
        return rolRepository.existsByNombreRol(nombreRol);
    }

    /**
     * Convierte una entidad Rol a DTO
     */
    private RolResponseDTO convertirADTO(Rol rol) {
        RolResponseDTO dto = new RolResponseDTO();
        dto.setIdRol(rol.getIdRol());
        dto.setNombreRol(rol.getNombreRol());
        dto.setActivo(rol.getActivo());
        return dto;
    }
}