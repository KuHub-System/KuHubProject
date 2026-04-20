package KuHub.config.security.service;

import KuHub.modules.gestion_usuario.repository.PermisoRolRepository;
import KuHub.modules.gestion_usuario.repository.RolRepository;
import KuHub.modules.gestion_usuario.entity.PermisoRol;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de evaluación dinámica de permisos.
 *
 * En lugar de hardcodear roles en SpringSecurityConfig, este servicio consulta
 * la tabla permiso_rol en tiempo de ejecución para validar el acceso.
 *
 * Uso con @PreAuthorize:
 *   @PreAuthorize("@permSvc.check(authentication, 'GESTION_ROLES', 'write')")
 *
 * ✅ ADMINISTRADOR siempre retorna true (control total).
 * ✅ Otros roles se consultan dinámicamente desde la BD.
 */
@Service("permSvc")
public class DynamicPermissionService {

    private final PermisoRolRepository permisoRolRepository;
    private final RolRepository rolRepository;

    @Autowired
    public DynamicPermissionService(PermisoRolRepository permisoRolRepository,
                                    RolRepository rolRepository) {
        this.permisoRolRepository = permisoRolRepository;
        this.rolRepository = rolRepository;
    }

    /**
     * Verifica si el usuario autenticado tiene el nivel de acceso requerido para un módulo.
     *
     * @param authentication Contexto de seguridad actual (inyectado por Spring en SpEL)
     * @param moduleCode     Código del módulo (ej: "GESTION_ROLES", "INVENTARIO")
     * @param level          Nivel requerido: "read" o "write"
     * @return true si tiene permiso, false en caso contrario
     */
    @Transactional(readOnly = true)
    public boolean check(Authentication authentication, String moduleCode, String level) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) return false;

            // ADMINISTRADOR siempre tiene acceso total sin consultar la BD
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR")
                               || a.getAuthority().equals("ROLE_CO_ADMINISTRADOR"));
            if (isAdmin) return true;

            // Extraer nombre del rol desde la authority del JWT
            // Ej: "ROLE_GESTOR_PEDIDOS" → "GESTOR_PEDIDOS"
            String roleName = authentication.getAuthorities().stream()
                    .findFirst()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .orElse(null);

            if (roleName == null) return false;

            // Buscar el rol en BD (insensible a mayúsculas)
            // La BD almacena nombres de rol en formato ENUM (ej: "GESTOR_PEDIDOS")
            return rolRepository.findByNombreRolIgnoreCase(roleName)
                    .flatMap(rol -> permisoRolRepository.findByRolIdAndModuleCode(
                            rol.getIdRol(), moduleCode))
                    .map(permiso -> evaluateLevel(permiso, level))
                    .orElse(false);
        } catch (Exception e) {
            // Si ocurre cualquier error inesperado, denegar acceso sin propagar un 500
            return false;
        }
    }

    private boolean evaluateLevel(PermisoRol permiso, String level) {
        boolean canWrite = Boolean.TRUE.equals(permiso.getPuedeCrear())
                || Boolean.TRUE.equals(permiso.getPuedeActualizar())
                || Boolean.TRUE.equals(permiso.getPuedeEliminar());

        return switch (level.toLowerCase()) {
            case "write" -> canWrite;
            case "read"  -> Boolean.TRUE.equals(permiso.getPuedeLeer()) || canWrite;
            default      -> false;
        };
    }
}
