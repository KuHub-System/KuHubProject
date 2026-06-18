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

            // Solo ADMINISTRADOR tiene acceso total sin consultar la BD.
            // CO_ADMINISTRADOR NO es bypass: respeta la matriz permiso_rol
            // (sin GESTION_ROLES ni ADMIN_SISTEMA), igual que cualquier otro rol.
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));
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

    /**
     * Igual que {@link #check}, pero acepta varios módulos candidatos.
     * Retorna true si el usuario tiene el nivel requerido en AL MENOS UNO de ellos.
     *
     * Útil para endpoints del backend que son compartidos por varios módulos del
     * frontend (ej: /api/v1/pedido lo usan GESTION_PEDIDOS y CONGLOMERADO_PEDIDOS).
     */
    @Transactional(readOnly = true)
    public boolean checkAny(Authentication authentication, java.util.List<String> moduleCodes, String level) {
        if (moduleCodes == null || moduleCodes.isEmpty()) return false;
        for (String moduleCode : moduleCodes) {
            if (check(authentication, moduleCode, level)) return true;
        }
        return false;
    }

    private boolean evaluateLevel(PermisoRol permiso, String level) {
        boolean canWrite = Boolean.TRUE.equals(permiso.getPuedeCrear())
                || Boolean.TRUE.equals(permiso.getPuedeActualizar())
                || Boolean.TRUE.equals(permiso.getPuedeEliminar());

        return switch (level.toLowerCase()) {
            case "write"  -> canWrite;
            case "create" -> Boolean.TRUE.equals(permiso.getPuedeCrear());
            case "update" -> Boolean.TRUE.equals(permiso.getPuedeActualizar());
            case "delete" -> Boolean.TRUE.equals(permiso.getPuedeEliminar());
            case "read"   -> Boolean.TRUE.equals(permiso.getPuedeLeer()) || canWrite;
            default       -> false;
        };
    }
}
