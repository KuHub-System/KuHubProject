package KuHub.config.security.permission;

import KuHub.config.security.service.DynamicPermissionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.Set;

/**
 * Interceptor central de autorización DINÁMICA por módulo.
 *
 * Reemplaza la autorización hardcodeada (hasRole) de SpringSecurityConfig para las
 * operaciones de ESCRITURA: mapea cada ruta + método HTTP a el/los módulo(s) y nivel
 * correspondiente, y delega la decisión en {@link DynamicPermissionService}, que consulta
 * la matriz permiso_rol en tiempo de ejecución. Así, cambiar un permiso en "Gestión de
 * Roles" afecta de inmediato la autorización real del backend ("la matriz manda").
 *
 * Reglas:
 *  - GET / OPTIONS / HEAD: no se interceptan (la lectura se gobierna en SpringSecurityConfig).
 *  - POST / PUT / PATCH / DELETE: se busca la primera regla que matchee (orden = prioridad).
 *      · regla con módulos == null  → SKIP (se permite a cualquier autenticado; ej: lecturas
 *        vía POST con filtros, o endpoints self-service / ya verificados en su controller).
 *      · DELETE → exige nivel "delete" (honra puede_eliminar). Resto → nivel "write".
 *  - Si ninguna regla matchea, se permite (queda gobernado por .authenticated() de Spring).
 *
 * El ADMINISTRADOR siempre pasa (atajo dentro de DynamicPermissionService). El
 * CO_ADMINISTRADOR NO es atajo: respeta la matriz como cualquier rol.
 */
@Component
public class DynamicPermissionInterceptor implements HandlerInterceptor {

    private final DynamicPermissionService permissionService;
    private final AntPathMatcher matcher = new AntPathMatcher();

    @Autowired
    public DynamicPermissionInterceptor(DynamicPermissionService permissionService) {
        this.permissionService = permissionService;
    }

    /** Regla de ruta → módulo(s). modules == null significa SKIP (permitir a autenticados). */
    private record Rule(Set<String> methods, String pattern, List<String> modules) {
        boolean skip() { return modules == null; }
    }

    private static Rule skip(String pattern, String... methods)  { return new Rule(Set.of(methods), pattern, null); }
    private static Rule mod(String pattern, List<String> modules, String... methods) { return new Rule(Set.of(methods), pattern, modules); }

    private static final String P = "POST", PU = "PUT", PA = "PATCH", D = "DELETE";

    /**
     * Tabla de reglas (PRIMERA QUE MATCHEA GANA → poner SKIP/específicas antes que las amplias).
     * Espejo de la estructura de SpringSecurityConfig.
     */
    private static final List<Rule> RULES = List.of(
        // ── Self-service y endpoints ya verificados en su propio controller → SKIP ──
        skip("/api/v*/usuarios/cambiar-contrasena", PA),
        skip("/api/v*/usuarios/actualizar-foto", PU),
        skip("/api/v1/permisos/**", P, PU, PA, D),       // PermisoRolController ya valida GESTION_ROLES
        skip("/api/v1/soporte", P),                       // cualquier autenticado puede reportar
        skip("/api/v1/notificacion/**", P, PU, PA, D),
        mod("/api/v1/gestion-sistema/**", List.of("ADMIN_SISTEMA", "ADMIN_CONFIG_SISTEMA"), P, PU, PA, D), // config global del sistema

        // ── Lecturas vía POST (paginación/búsqueda/filtros) → SKIP ──
        skip("/api/v*/pedido/consolidate", P),            // consulta GOD: lectura con DateRangeDTO
        skip("/api/v*/inventario/paged-inventory", P),
        skip("/api/v*/inventario/search-inventory", P),
        skip("/api/v*/inventario/search-inventory-by-code", P),
        skip("/api/v*/inventario/massive-producto-inventory-listing", P),
        skip("/api/v*/inventario/search-bodega", P),
        skip("/api/v*/inventario/search-by-cod-producto", P),
        skip("/api/v*/inventario/paged-bodega", P),
        skip("/api/v*/bodega-transito/paged-bodega", P),
        skip("/api/v*/bodega-transito/search-bodega", P),
        skip("/api/v*/bodega-transito/search-by-cod-producto", P),
        skip("/api/v*/bodega-transito/massive-warehouse-listing", P),
        skip("/api/v*/pedido-semana-bodega/find-all-recipes-pagined/**", P),
        skip("/api/v*/pedido-semana-bodega/search-recipes", P),
        skip("/api/v*/solicitud/find-solicitations-per-week", P),
        skip("/api/v*/solicitudes/find-solicitations-per-week", P),
        skip("/api/v*/solicitud/order-for-consolidation", P),
        skip("/api/v*/solicitudes/order-for-consolidation", P),
        skip("/api/v*/solicitud/abastecimiento-bodega", P),
        skip("/api/v*/solicitudes/abastecimiento-bodega", P),
        skip("/api/v*/usuario/find-all-users-with-pagination", P),
        skip("/api/v*/usuario/find-users-by-filter", P),
        skip("/api/v*/usuarios/find-all-users-with-pagination", P),
        skip("/api/v*/usuarios/find-users-by-filter", P),
        skip("/api/v*/movimiento/find-all-motion-with-filter", P),
        skip("/api/v*/semanas/**", P),                    // POST en semanas = búsqueda/consulta

        // ── Escrituras específicas que comparten ruta base ──
        mod("/api/v*/pedido/entregas-diarias", List.of("GESTION_PEDIDOS_DIARIOS", "GESTION_PEDIDOS"), P),
        mod("/api/v*/pedido/preparar-entrega", List.of("GESTION_PEDIDOS_DIARIOS", "GESTION_PEDIDOS"), P),
        mod("/api/v*/orden-pedido/detalles/entregar", List.of("GESTION_PEDIDOS_DIARIOS", "GESTION_PEDIDOS"), PA),
        mod("/api/v*/pedido-semana-bodega/importar-excel", List.of("PEDIDO_SEM_CREAR"), P),

        // ── Inventario y catálogos ──
        mod("/api/v*/producto/**",  List.of("INVENTARIO"), P, PU, PA, D),
        mod("/api/v*/productos/**", List.of("INVENTARIO"), P, PU, PA, D),
        mod("/api/v*/inventario/**", List.of("INVENTARIO"), P, PU, PA, D),
        mod("/api/v*/categoria/**", List.of("GESTION_CATEGORIAS"), P, PU, PA, D),
        mod("/api/v*/unidad-medida/**", List.of("GESTION_UNIDADES"), P, PU, PA, D),
        mod("/api/v*/movimiento/**", List.of("HISTORIAL_MOVIMIENTOS"), P, PU, PA, D),
        mod("/api/v*/bodega-transito/**", List.of("BODEGA_TRANSITO"), P, PU, PA, D),
        mod("/api/v*/stock-disponible/**", List.of("BODEGA_TRANSITO"), P, PU, PA, D),

        // ── Pedido semanal a bodega (antiguas recetas) ──
        // Acciones GRANULARES: el padre PEDIDO_SEMANAL_BODEGA es solo acceso de página (lectura);
        // toda escritura la gobiernan los módulos de acción para que la revocación por ícono sea
        // autoritativa. write satisface Nuevo/Editar/Inactivar; DELETE exige Eliminar (nivel delete).
        mod("/api/v*/pedido-semana-bodega/**", List.of("PEDIDO_SEM_CREAR", "PEDIDO_SEM_EDITAR", "PEDIDO_SEM_INACTIVAR", "PEDIDO_SEM_ELIMINAR"), P, PU, PA, D),
        mod("/api/v*/detalle-pedido-semana-bodega/**", List.of("PEDIDO_SEM_CREAR", "PEDIDO_SEM_EDITAR", "PEDIDO_SEM_INACTIVAR", "PEDIDO_SEM_ELIMINAR"), P, PU, PA, D),

        // ── Académica / Administración del Sistema (recursos compartidos) ──
        mod("/api/v*/bloque-horario/**", List.of("GESTION_ACADEMICA", "ADMIN_SISTEMA", "ADMIN_BLOQUES_HORARIOS"), P, PU, PA, D),
        mod("/api/v*/sala/**", List.of("GESTION_ACADEMICA", "ADMIN_SISTEMA", "ADMIN_SALAS_RESERVAS"), P, PU, PA, D),
        mod("/api/v*/semanas/**", List.of("GESTION_ACADEMICA", "ADMIN_SISTEMA", "ADMIN_SEMANAS"), PU, PA, D),
        mod("/api/v*/reserva-sala/**", List.of("GESTION_ACADEMICA", "ADMIN_SISTEMA", "ADMIN_SALAS_RESERVAS"), P, PU, PA, D),
        mod("/api/v*/asignatura/**", List.of("GESTION_ACADEMICA"), P, PU, PA, D),
        mod("/api/v*/seccion/**", List.of("GESTION_ACADEMICA"), P, PU, PA, D),
        mod("/api/v*/docente-seccion/**", List.of("GESTION_ACADEMICA"), P, PU, PA, D),

        // ── Solicitudes (SOLICITUD = crear; GESTION_SOLICITUDES = administrar; misma ruta) ──
        mod("/api/v*/solicitud/**", List.of("SOLICITUD", "GESTION_SOLICITUDES"), P, PU, PA, D),
        mod("/api/v*/solicitudes/**", List.of("SOLICITUD", "GESTION_SOLICITUDES"), P, PU, PA, D),

        // ── Pedidos (GESTION_PEDIDOS / CONGLOMERADO_PEDIDOS comparten endpoints) ──
        mod("/api/v*/orden-pedido/**", List.of("GESTION_PEDIDOS", "GESTION_PROVEEDORES"), P, PU, PA, D),
        mod("/api/v*/pedido/**", List.of("GESTION_PEDIDOS", "CONGLOMERADO_PEDIDOS"), P, PU, PA, D),
        mod("/api/v*/detalle-pedido/**", List.of("GESTION_PEDIDOS", "CONGLOMERADO_PEDIDOS"), P, PU, PA, D),
        mod("/api/v*/pedido-solicitud/**", List.of("GESTION_PEDIDOS", "CONGLOMERADO_PEDIDOS"), P, PU, PA, D),
        mod("/api/v*/categoria-abastecimiento/**", List.of("GESTION_PROVEEDORES", "GESTION_PEDIDOS", "INVENTARIO"), P, PU, PA, D),

        // ── Proveedores ──
        mod("/api/v*/proveedor/**", List.of("GESTION_PROVEEDORES"), P, PU, PA, D),

        // ── Roles y usuarios ──
        mod("/api/v*/roles/**", List.of("GESTION_ROLES"), P, PU, PA, D),
        mod("/api/v*/roles", List.of("GESTION_ROLES"), P, PU, PA, D),
        mod("/api/v*/usuarios/**", List.of("GESTION_USUARIOS"), P, PU, PA, D),
        mod("/api/v*/usuario/**", List.of("GESTION_USUARIOS"), P, PU, PA, D)
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        final String method = request.getMethod();

        // Solo interceptamos escrituras; las lecturas (GET) las gobierna SpringSecurityConfig.
        if (!(P.equals(method) || PU.equals(method) || PA.equals(method) || D.equals(method))) {
            return true;
        }

        final String path = request.getRequestURI();

        Rule matched = null;
        for (Rule rule : RULES) {
            if (rule.methods().contains(method) && matcher.match(rule.pattern(), path)) {
                matched = rule;
                break;
            }
        }

        // Sin regla → no es una ruta gobernada por módulo: la deja pasar (queda en .authenticated()).
        if (matched == null || matched.skip()) {
            return true;
        }

        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        final String level = D.equals(method) ? "delete" : "write";

        if (permissionService.checkAny(auth, matched.modules(), level)) {
            return true;
        }

        response.setContentType("application/json");
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.getWriter().write(
            "{\"error\":\"Acceso denegado\",\"message\":\"No tienes permiso para esta acción sobre el módulo requerido.\"}");
        return false;
    }
}
