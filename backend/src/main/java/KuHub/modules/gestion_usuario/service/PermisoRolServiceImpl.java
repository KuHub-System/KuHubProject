package KuHub.modules.gestion_usuario.service;

import KuHub.modules.gestion_usuario.dtos.PermisoMatrizDTO;
import KuHub.modules.gestion_usuario.dtos.PermisoRolRequestDTO;
import KuHub.modules.gestion_usuario.dtos.PermisoRolResponseDTO;
import KuHub.modules.gestion_usuario.entity.Modulo;
import KuHub.modules.gestion_usuario.entity.PermisoRol;
import KuHub.modules.gestion_usuario.entity.Rol;
import KuHub.modules.gestion_usuario.repository.ModuloRepository;
import KuHub.modules.gestion_usuario.repository.PermisoRolRepository;
import KuHub.modules.gestion_usuario.repository.RolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class PermisoRolServiceImpl implements PermisoRolService {

    private final PermisoRolRepository permisoRolRepository;
    private final RolRepository rolRepository;
    private final ModuloRepository moduloRepository;

    @Autowired
    public PermisoRolServiceImpl(PermisoRolRepository permisoRolRepository,
                                 RolRepository rolRepository,
                                 ModuloRepository moduloRepository) {
        this.permisoRolRepository = permisoRolRepository;
        this.rolRepository = rolRepository;
        this.moduloRepository = moduloRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, List<PermisoMatrizDTO>> getPermissionMatrix() {
        List<PermisoRolRepository.PermisoMatrizProjection> rows = permisoRolRepository.findPermissionMatrix();

        // Mapear proyecciones a DTOs
        List<PermisoMatrizDTO> dtos = rows.stream().map(p -> {
            PermisoMatrizDTO dto = new PermisoMatrizDTO();
            dto.setIdRol(p.getIdRol());
            dto.setNombreRol(p.getNombreRol());
            dto.setIdModulo(p.getIdModulo());
            dto.setCodigoModulo(p.getCodigoModulo());
            dto.setNombreModulo(p.getNombreModulo());
            dto.setOrdenModulo(p.getOrdenModulo());
            dto.setIdPermisoRol(p.getIdPermisoRol());
            dto.setPuedeLeer(Boolean.TRUE.equals(p.getPuedeLeer()));
            dto.setPuedeCrear(Boolean.TRUE.equals(p.getPuedeCrear()));
            dto.setPuedeActualizar(Boolean.TRUE.equals(p.getPuedeActualizar()));
            dto.setPuedeEliminar(Boolean.TRUE.equals(p.getPuedeEliminar()));
            return dto;
        }).collect(Collectors.toList());

        // Agrupar por codigoModulo (manteniendo orden de inserción)
        return dtos.stream().collect(
                Collectors.groupingBy(
                        PermisoMatrizDTO::getCodigoModulo,
                        LinkedHashMap::new,
                        Collectors.toList()
                )
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermisoRolResponseDTO> getPermisosByRol(Integer idRol) {
        return permisoRolRepository.findByRol_IdRolAndEnabledTrue(idRol)
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public PermisoRolResponseDTO crearPermiso(PermisoRolRequestDTO request) {
        Rol rol = rolRepository.findById(request.getIdRol())
                .orElseThrow(() -> new RuntimeException("Rol no encontrado: " + request.getIdRol()));
        Modulo modulo = moduloRepository.findById(request.getIdModulo())
                .orElseThrow(() -> new RuntimeException("Módulo no encontrado: " + request.getIdModulo()));

        PermisoRol permiso = new PermisoRol();
        permiso.setRol(rol);
        permiso.setModulo(modulo);
        permiso.setPuedeLeer(Boolean.TRUE.equals(request.getPuedeLeer()));
        permiso.setPuedeCrear(Boolean.TRUE.equals(request.getPuedeCrear()));
        permiso.setPuedeActualizar(Boolean.TRUE.equals(request.getPuedeActualizar()));
        permiso.setPuedeEliminar(Boolean.TRUE.equals(request.getPuedeEliminar()));
        permiso.setEnabled(true);

        return toResponseDTO(permisoRolRepository.save(permiso));
    }

    @Override
    public PermisoRolResponseDTO actualizarPermiso(Long idPermisoRol, PermisoRolRequestDTO request) {
        PermisoRol permiso = permisoRolRepository.findById(idPermisoRol)
                .orElseThrow(() -> new RuntimeException("Permiso no encontrado: " + idPermisoRol));

        permiso.setPuedeLeer(Boolean.TRUE.equals(request.getPuedeLeer()));
        permiso.setPuedeCrear(Boolean.TRUE.equals(request.getPuedeCrear()));
        permiso.setPuedeActualizar(Boolean.TRUE.equals(request.getPuedeActualizar()));
        permiso.setPuedeEliminar(Boolean.TRUE.equals(request.getPuedeEliminar()));

        return toResponseDTO(permisoRolRepository.save(permiso));
    }

    @Override
    public PermisoRolResponseDTO upsertPermiso(PermisoRolRequestDTO request) {
        return permisoRolRepository
                .findByRol_IdRolAndModulo_IdModulo(request.getIdRol(), request.getIdModulo())
                .map(existing -> actualizarPermiso(existing.getIdPermisoRol(), request))
                .orElseGet(() -> crearPermiso(request));
    }

    @Override
    @Transactional
    public void restaurarPredeterminado() {
        List<Rol>    roles   = rolRepository.findByActivoTrue();
        List<Modulo> modulos = moduloRepository.findByEnabledTrueOrderByOrdenModuloAsc();

        for (Rol rol : roles) {
            for (Modulo modulo : modulos) {
                boolean[] p = defaultPermisos(rol.getNombreRol(), modulo.getCodigoModulo());
                PermisoRolRequestDTO dto = new PermisoRolRequestDTO();
                dto.setIdRol(rol.getIdRol());
                dto.setIdModulo(modulo.getIdModulo());
                dto.setPuedeLeer(p[0]);
                dto.setPuedeCrear(p[1]);
                dto.setPuedeActualizar(p[2]);
                dto.setPuedeEliminar(p[3]);
                upsertPermiso(dto);
            }
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private boolean[] defaultPermisos(String rol, String modulo) {
        return switch (rol) {
            case "ADMINISTRADOR"    -> new boolean[]{true, true, true, true};
            case "CO_ADMINISTRADOR" -> defaultCoAdmin(modulo);
            case "GESTOR_PEDIDOS"   -> defaultGestorPedidos(modulo);
            case "PROFESOR_A_CARGO" -> defaultProfesorACargo(modulo);
            case "DOCENTE"          -> defaultDocente(modulo);
            case "ENCARGADO_BODEGA" -> defaultEncargadoBodega(modulo);
            case "ASISTENTE_BODEGA" -> defaultAsistenteBodega(modulo);
            default -> new boolean[]{false, false, false, false};
        };
    }

    private boolean[] defaultCoAdmin(String m) {
        if (Set.of("GESTION_ROLES", "ADMIN_SISTEMA").contains(m))
            return new boolean[]{false, false, false, false};
        if ("GESTION_USUARIOS".equals(m))
            return new boolean[]{true, true, true, false};
        return new boolean[]{true, true, true, true};
    }

    private boolean[] defaultGestorPedidos(String m) {
        if ("DASHBOARD".equals(m))
            return new boolean[]{true, false, false, false};
        if (Set.of("GESTION_PEDIDOS", "GESTION_SOLICITUDES", "CONGLOMERADO_PEDIDOS").contains(m))
            return new boolean[]{true, true, true, false};
        return new boolean[]{false, false, false, false};
    }

    private boolean[] defaultProfesorACargo(String m) {
        if (Set.of("DASHBOARD", "GESTION_RECETAS").contains(m))
            return new boolean[]{true, false, false, false};
        if ("SOLICITUD".equals(m))
            return new boolean[]{true, true, true, false};
        return new boolean[]{false, false, false, false};
    }

    private boolean[] defaultDocente(String m) {
        if (Set.of("DASHBOARD", "SOLICITUD", "GESTION_RECETAS").contains(m))
            return new boolean[]{true, false, false, false};
        return new boolean[]{false, false, false, false};
    }

    private boolean[] defaultEncargadoBodega(String m) {
        if ("DASHBOARD".equals(m))
            return new boolean[]{true, false, false, false};
        if (Set.of("INVENTARIO", "GESTION_CATEGORIAS", "GESTION_UNIDADES",
                   "HISTORIAL_MOVIMIENTOS", "GESTION_PEDIDOS_DIARIOS", "BODEGA_TRANSITO").contains(m))
            return new boolean[]{true, true, true, false};
        return new boolean[]{false, false, false, false};
    }

    private boolean[] defaultAsistenteBodega(String m) {
        if ("DASHBOARD".equals(m))
            return new boolean[]{true, false, false, false};
        if ("BODEGA_TRANSITO".equals(m))
            return new boolean[]{true, true, false, false};
        if (Set.of("GESTION_CATEGORIAS", "GESTION_UNIDADES", "HISTORIAL_MOVIMIENTOS").contains(m))
            return new boolean[]{true, false, false, false};
        if ("GESTION_PEDIDOS_DIARIOS".equals(m))
            return new boolean[]{true, true, true, false};
        return new boolean[]{false, false, false, false};
    }

    private PermisoRolResponseDTO toResponseDTO(PermisoRol p) {
        return new PermisoRolResponseDTO(
                p.getIdPermisoRol(),
                p.getRol().getIdRol(),
                p.getRol().getNombreRol(),
                p.getModulo().getIdModulo(),
                p.getModulo().getCodigoModulo(),
                p.getModulo().getNombreModulo(),
                p.getPuedeLeer(),
                p.getPuedeCrear(),
                p.getPuedeActualizar(),
                p.getPuedeEliminar(),
                p.getEnabled()
        );
    }
}
