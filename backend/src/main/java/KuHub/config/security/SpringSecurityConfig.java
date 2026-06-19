package KuHub.config.security;

import KuHub.config.security.filter.JwtAuthenticationFilter;
import KuHub.config.security.filter.JwtValidationFilter;
import KuHub.config.security.rate_limiting.RateLimitFilter;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
import KuHub.modules.gestion_usuario.service.RefreshTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * Configuración de seguridad de Spring Security con JWT
 * ✅ CONFIGURACIÓN SEGURA: CORS restrictivo, validación de tokens, roles por endpoint
 * ✅ ObjectMapper inyectado para manejo correcto de fechas
 * ✅ Swagger UI habilitado para desarrollo
 */
@Configuration
public class SpringSecurityConfig {

    private final AuthenticationConfiguration authenticationConfiguration;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;
    private final RateLimitFilter rateLimitFilter;
    private final RefreshTokenService refreshTokenService;

    @Autowired
    public SpringSecurityConfig(AuthenticationConfiguration authenticationConfiguration,
                                UsuarioRepository usuarioRepository,
                                ObjectMapper objectMapper,
                                RateLimitFilter rateLimitFilter,
                                RefreshTokenService refreshTokenService) {
        this.authenticationConfiguration = authenticationConfiguration;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
        this.rateLimitFilter = rateLimitFilter;
        this.refreshTokenService = refreshTokenService;

        // Configuración centralizada de ObjectMapper para JWT
        this.objectMapper.addMixIn(SimpleGrantedAuthority.class, SimpleGrantedAuthorityJsonCreator.class);
    }

    /**
     * Bean que proporciona el codificador de contraseñas BCrypt
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Bean que proporciona el AuthenticationManager
     */
    @Bean
    public AuthenticationManager authenticationManager() throws Exception {
        return this.authenticationConfiguration.getAuthenticationManager();
    }

    /**
     * Configuración de CORS - RESTRICTIVA Y SEGURA
     * ✅ Solo permite el origen específico del frontend
     * ✅ Solo permite los métodos HTTP necesarios
     * ✅ Solo expone los headers necesarios
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ========================================
        // ORÍGENES PERMITIDOS
        // ========================================
        // ⚠️ DESARROLLO: localhost:5173
        configuration.setAllowedOrigins(Arrays.asList(
                // ⚠️ DESARROLLO (Tu PC)
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",

                // 🚀 PRODUCCIÓN (AWS Lightsail - IP directa)
                "http://52.5.222.79",
                "http://52.5.222.79:80",
                "http://52.5.222.79:8080",
                "https://52.5.222.79",
                "https://52.5.222.79:443",

                // 🌐 PRODUCCIÓN (Subdominio QuestWeb)
                "https://appkuhub.questweb.cl",
                "http://appkuhub.questweb.cl"
        ));

        // ⚠️ PRODUCCIÓN: Cambiar a la URL de tu frontend en AWS
        // configuration.setAllowedOrigins(Arrays.asList(
        //     "https://tu-dominio-frontend.com"
        // ));

        // ========================================
        // MÉTODOS HTTP PERMITIDOS
        // ========================================
        configuration.setAllowedMethods(Arrays.asList(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
        ));

        // ========================================
        // HEADERS PERMITIDOS
        // ========================================
        // Permitir los headers que el frontend envía
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",     // Para el token JWT
                "Content-Type",      // Para JSON
                "Accept",            // Para negociación de contenido
                "Origin",            // Para CORS
                "Access-Control-Request-Method",   // Para preflight
                "Access-Control-Request-Headers"   // Para preflight
        ));

        // ========================================
        // CREDENCIALES
        // ========================================
        // Permitir el envío de cookies y headers de autenticación
        configuration.setAllowCredentials(true);

        // ========================================
        // HEADERS EXPUESTOS
        // ========================================
        // Headers que el frontend puede leer de la respuesta
        configuration.setExposedHeaders(Arrays.asList(
                "Authorization",     // Para que el frontend lea el token
                "Content-Type"
        ));

        // ========================================
        // CACHE DEL PREFLIGHT
        // ========================================
        // El navegador cachea la respuesta del preflight por 1 hora
        configuration.setMaxAge(3600L);

        // ========================================
        // APLICAR A TODAS LAS RUTAS
        // ========================================
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    /**
     * Configuración principal de seguridad
     * Define qué endpoints son públicos y cuáles requieren autenticación
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests((authz) -> authz
                        // ========================================
                        // ENDPOINTS PÚBLICOS (sin autenticación)
                        // ========================================
                        // Login - manejado por JwtAuthenticationFilter
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        // Refresh token: no requiere Access Token (justamente sirve para obtener uno nuevo)
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").permitAll()
                        // Preflight requests de CORS (OPTIONS)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ========================================
                        // 📚 SWAGGER UI - PÚBLICO PARA DESARROLLO
                        // ========================================
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml",
                                "/swagger-resources/**",
                                "/swagger-resources",
                                "/configuration/ui",
                                "/configuration/security",
                                "/webjars/**",
                                "/api-docs/**"
                        ).permitAll()

                        // ⚠️ PRODUCCIÓN: Comentar las líneas de arriba o restringir por IP/rol
                        // .requestMatchers("/swagger-ui/**").hasRole("ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE DASHBOARD (analytics por rol)
                        // ========================================
                        .requestMatchers(HttpMethod.GET, "/api/v1/dashboard/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE PERMISOS (CRUD por Rol × Módulo)
                        // ========================================
                        // Matriz de permisos: cualquier usuario autenticado puede leerla
                        .requestMatchers(HttpMethod.GET, "/api/v1/permisos/matrix").authenticated()
                        // Permisos de un rol: cualquier usuario autenticado (carga sus propios permisos)
                        .requestMatchers(HttpMethod.GET, "/api/v1/permisos/rol/**").authenticated()
                        // Crear / actualizar permisos: requiere autenticación mínima.
                        // La autorización real se realiza dinámicamente con @PreAuthorize
                        // en PermisoRolController usando DynamicPermissionService (GESTION_ROLES write).
                        .requestMatchers(HttpMethod.POST, "/api/v1/permisos/**").authenticated()
                        .requestMatchers(HttpMethod.PUT,  "/api/v1/permisos/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE ROLES
                        // ========================================
                        // Endpoints de roles v1 (lectura pública)
                        .requestMatchers(HttpMethod.GET, "/api/v1/roles").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/roles/**").permitAll()

                        // Endpoints de roles v2 con HATEOAS (lectura pública)
                        .requestMatchers(HttpMethod.GET, "/api/v2/roles").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v2/roles/**").permitAll()

                        // Escritura de roles: autorización dinámica (GESTION_ROLES) vía DynamicPermissionInterceptor
                        .requestMatchers(HttpMethod.POST, "/api/v*/roles").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/roles/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/roles/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/roles/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE USUARIOS
                        // ========================================

                        // 1. UNIVERSAL: Cualquier usuario logueado puede cambiar su PROPIA clave o foto
                        // Se usa .authenticated() para que aplique a Docentes, Asistentes, Admins, etc.
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/usuarios/cambiar-contrasena").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/usuarios/actualizar-foto").authenticated()

                        // 2. LECTURA (Listar usuarios): cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET, "/api/v*/usuarios/**").authenticated()

                        // 2b. POST de LECTURA para usuarios (paginación/búsqueda): cualquier autenticado
                        .requestMatchers(HttpMethod.POST,
                                "/api/v*/usuario/find-all-users-with-pagination",
                                "/api/v*/usuario/find-users-by-filter",
                                "/api/v*/usuarios/find-all-users-with-pagination",
                                "/api/v*/usuarios/find-users-by-filter"
                        ).authenticated()

                        // 3. GESTIÓN ADMINISTRATIVA (Crear/Editar otros usuarios): dinámico (GESTION_USUARIOS)
                        .requestMatchers(HttpMethod.POST, "/api/v*/usuarios").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/usuarios/**").authenticated()

                        // 4. ELIMINACIÓN: dinámico (GESTION_USUARIOS → delete)
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/usuarios/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE CATEGORIA
                        // ========================================

                        // Lectura pública
                        .requestMatchers(HttpMethod.GET, "/api/v*/categoria/**").permitAll()

                        // Escritura de categorías: dinámico (GESTION_CATEGORIAS) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v*/categoria/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/categoria/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/categoria/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE UNIDAD DE MEDIDA
                        // ========================================

                        // Lectura pública
                        .requestMatchers(HttpMethod.GET, "/api/v*/unidad-medida/**").permitAll()

                        // Escritura de unidades: dinámico (GESTION_UNIDADES) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v*/unidad-medida/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/unidad-medida/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/unidad-medida/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/unidad-medida/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE PRODUCTOS
                        // ========================================
                        // Productos - lectura pública, modificación restringida
                        .requestMatchers(HttpMethod.GET, "/api/v*/producto/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v*/productos/**").permitAll()

                        // Escritura de productos: dinámico (INVENTARIO) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v*/producto").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v*/productos").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/producto/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/productos/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/producto/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/productos/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE INVENTARIO
                        // ========================================
                        // 1. Lectura: Permitida para todos (Público o Autenticados)
                        .requestMatchers(HttpMethod.GET, "/api/v*/inventario/**").permitAll()

                        // 2a. POST de LECTURA (paginación/búsqueda): cualquier usuario autenticado puede consultar
                        //     Necesario para roles que ven el inventario en otras páginas (ej: al crear recetas)
                        .requestMatchers(HttpMethod.POST,
                                "/api/v*/inventario/paged-inventory",
                                "/api/v*/inventario/search-inventory",
                                "/api/v*/inventario/search-inventory-by-code",
                                "/api/v*/inventario/massive-producto-inventory-listing",
                                "/api/v*/inventario/search-bodega",
                                "/api/v*/inventario/search-by-cod-producto",
                                "/api/v*/inventario/paged-bodega"
                        ).authenticated()

                        // Escritura de inventario: dinámico (INVENTARIO) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v*/inventario/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/inventario/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/inventario/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/inventario/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE MOVIMIENTOS DE INVENTARIO
                        // ========================================

                        // POST de lectura/filtro: cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.POST, "/api/v1/movimiento/find-all-motion-with-filter")
                        .authenticated()

                        // POST de creación/registro de movimiento: dinámico (HISTORIAL_MOVIMIENTOS) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v1/movimiento/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE BODEGA DE TRÁNSITO
                        // ========================================

                        .requestMatchers(HttpMethod.GET, "/api/v*/bodega-transito/**").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v*/bodega-transito/paged-bodega",
                                "/api/v*/bodega-transito/search-bodega",
                                "/api/v*/bodega-transito/search-by-cod-producto",
                                "/api/v*/bodega-transito/massive-warehouse-listing"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v*/bodega-transito/**")
                        .authenticated() // Creación: permiso granular verificado dinámicamente en BodegaTransitoController

                        .requestMatchers(HttpMethod.PATCH, "/api/v*/bodega-transito/**")
                        .authenticated() // Permiso granular verificado dinámicamente en BodegaTransitoController

                        .requestMatchers(HttpMethod.DELETE, "/api/v*/bodega-transito/**")
                        .authenticated() // dinámico (BODEGA_TRANSITO → delete) vía interceptor

                        // ========================================
                        // ENDPOINTS DE PEDIDO SEMANA BODEGA (Antigua "Recetas")
                        // ========================================

                        // 0. Selector de asignaturas: cualquier autenticado (selector usado en múltiples páginas)
                        .requestMatchers(HttpMethod.GET, "/api/v1/pedido-semana-bodega/asignaturas/activas")
                        .authenticated()

                        // 1. LECTURA (GET): cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET, "/api/v*/pedido-semana-bodega/**", "/api/v*/detalle-pedido-semana-bodega/**")
                        .authenticated()

                        // 2a. POST de LECTURA (paginación/búsqueda): cualquier autenticado
                        .requestMatchers(HttpMethod.POST,
                                "/api/v*/pedido-semana-bodega/find-all-recipes-pagined/**",
                                "/api/v*/pedido-semana-bodega/search-recipes"
                        ).authenticated()

                        // Escritura de pedido semanal a bodega: dinámico (PEDIDO_SEMANAL_BODEGA) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v*/pedido-semana-bodega/importar-excel").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v*/pedido-semana-bodega/**", "/api/v*/detalle-pedido-semana-bodega/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/pedido-semana-bodega/**", "/api/v*/detalle-pedido-semana-bodega/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/pedido-semana-bodega/**", "/api/v*/detalle-pedido-semana-bodega/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/pedido-semana-bodega/**", "/api/v*/detalle-pedido-semana-bodega/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE BLOQUES HORARIOS
                        // ========================================

                        // 1. Lectura pública: Para que el frontend liste los horarios disponibles
                        .requestMatchers(HttpMethod.GET, "/api/v*/bloque-horario/**").permitAll()

                        // 2. Gestión (Crear, Editar, Borrar): Solo roles administrativos
                        .requestMatchers(HttpMethod.POST, "/api/v*/bloque-horario/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/bloque-horario/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/bloque-horario/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/bloque-horario/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE SEMANAS (CALENDARIO ACADÉMICO)
                        // ========================================

                        // 1. Lectura pública: Para que todos puedan ver el calendario del semestre
                        .requestMatchers(HttpMethod.GET, "/api/v*/semanas/**").permitAll()

                        // 2. POST en semanas: incluye endpoints de búsqueda/consulta (ej: find-by-weekly-for-solicitation)
                        //    que son necesarios en casi todas las páginas del sistema.
                        //    La gestión real (crear/modificar semanas) la hacen solo ADMIN/CO_ADMIN con PUT/PATCH/DELETE.
                        .requestMatchers(HttpMethod.POST, "/api/v*/semanas/**").authenticated()

                        // 3. Modificación y eliminación: Solo roles administrativos
                        .requestMatchers(HttpMethod.PUT, "/api/v*/semanas/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/semanas/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/semanas/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE RESERVA SALA
                        // ========================================

                        // 1. Lectura autenticada: solo usuarios con sesión activa pueden ver las reservas
                        .requestMatchers(HttpMethod.GET, "/api/v*/reserva-sala/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE SALAS
                        // ========================================

                        // 1. Lectura pública: Para que el frontend pueda listar las salas en los formularios
                        .requestMatchers(HttpMethod.GET, "/api/v*/sala/**").permitAll()

                        // 2. Gestión (Crear, Editar, Borrar): Solo roles administrativos
                        .requestMatchers(HttpMethod.POST, "/api/v*/sala/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/sala/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/sala/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/sala/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE SOLICITUDES
                        // ========================================

                        // 1. LECTURA (GET): cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET, "/api/v*/solicitudes/**", "/api/v*/solicitud/**")
                        .authenticated()

                        // 2a. POST de LECTURA (consulta semanal/consolidada): roles con acceso de lectura
                        //     Estos endpoints usan POST para enviar filtros de fecha, no para crear solicitudes
                        .requestMatchers(HttpMethod.POST,
                                "/api/v*/solicitud/find-solicitations-per-week",
                                "/api/v*/solicitudes/find-solicitations-per-week",
                                "/api/v*/solicitud/order-for-consolidation",
                                "/api/v*/solicitudes/order-for-consolidation",
                                "/api/v*/solicitud/abastecimiento-bodega",
                                "/api/v*/solicitudes/abastecimiento-bodega"
                        ).authenticated()

                        // Escritura de solicitudes: dinámico (SOLICITUD / GESTION_SOLICITUDES) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v*/solicitudes/**", "/api/v*/solicitud/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/solicitudes/**", "/api/v*/solicitud/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/solicitudes/**", "/api/v*/solicitud/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/solicitudes/**", "/api/v*/solicitud/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE GESTIÓN DE PEDIDOS (NUEVO)
                        // ========================================
                        // 1. LECTURA (GET): cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).authenticated()

                        // Agregar el controlador de /api/v1/gestion-sistema
                        .requestMatchers(HttpMethod.GET, "/api/v1/gestion-sistema/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/gestion-sistema/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/gestion-sistema/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/gestion-sistema/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/gestion-sistema/**").authenticated()

                        // 1. LECTURA (GET): cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).authenticated()

                        // Escritura de pedidos: dinámico (GESTION_PEDIDOS / CONGLOMERADO_PEDIDOS /
                        // GESTION_PEDIDOS_DIARIOS para entregas) vía interceptor
                        .requestMatchers(HttpMethod.POST,
                        "/api/v*/pedido/entregas-diarias",
                        "/api/v*/pedido/preparar-entrega"
                        ).authenticated()
                        .requestMatchers(HttpMethod.POST,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).authenticated()
                        .requestMatchers(HttpMethod.PUT,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).authenticated()
                        .requestMatchers(HttpMethod.PATCH,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).authenticated()
                        .requestMatchers(HttpMethod.DELETE,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).authenticated()

                        // ========================================
                        // ENDPOINTS DE GESTIÓN DE PROVEEDORES
                        // ========================================

                        // 1. LECTURA (GET): cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET, "/api/v1/proveedor/**").authenticated()

                        // Escritura de proveedores: dinámico (GESTION_PROVEEDORES) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v1/proveedor/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/proveedor/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/proveedor/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE CONFIGURACIÓN DE ABASTECIMIENTO POR CATEGORÍA
                        // ========================================

                        // Lectura: cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET, "/api/v1/categoria-abastecimiento/**").authenticated()

                        // Actualización: dinámico (GESTION_PROVEEDORES / GESTION_PEDIDOS / INVENTARIO) vía interceptor
                        .requestMatchers(HttpMethod.PUT, "/api/v1/categoria-abastecimiento/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE ÓRDENES DE PEDIDO (Tarea #13)
                        // ========================================

                        // 1. LECTURA (GET): cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET, "/api/v1/orden-pedido/**").authenticated()

                        // Escritura de órdenes de pedido: dinámico (GESTION_PEDIDOS / GESTION_PROVEEDORES) vía interceptor
                        .requestMatchers(HttpMethod.POST, "/api/v1/orden-pedido/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/orden-pedido/detalles/entregar").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/orden-pedido/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/orden-pedido/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE STOCK DISPONIBLE (sobrantes bodega)
                        // ========================================
                        // Lectura: cualquier autenticado — la matriz controla el acceso real
                        .requestMatchers(HttpMethod.GET, "/api/v1/stock-disponible/**").authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/v1/stock-disponible/**")
                        .authenticated() // dinámico (BODEGA_TRANSITO) vía interceptor

                        // ========================================
                        // ENDPOINTS DE NOTIFICACIONES (resumen unificado del header)
                        // Accesible para cualquier usuario autenticado; el servicio filtra por rol.
                        // ========================================
                        .requestMatchers(HttpMethod.GET, "/api/v1/notificacion/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE SOPORTE (reporte de errores desde el header)
                        // Cualquier usuario autenticado puede enviar un ticket.
                        // ========================================
                        .requestMatchers(HttpMethod.POST, "/api/v1/soporte").authenticated()

                        // ========================================
                        // ENDPOINTS DE NOTIFICACIONES (resumen unificado del header)
                        // Accesible para cualquier usuario autenticado; el servicio filtra por rol.
                        // ========================================
                        .requestMatchers(HttpMethod.GET, "/api/v1/notificacion/**").authenticated()

                        // ========================================
                        // ENDPOINTS DE ASISTENTE IA (Ollama)
                        // ========================================
                        // Chat con la IA: cualquier usuario autenticado puede usarlo.
                        // La IA corre en instancia dedicada y solo es accesible vía backend (VPC privada).
                        .requestMatchers(HttpMethod.POST, "/api/v1/ia/**").authenticated()

                        // ========================================
                        // RESTO DE ENDPOINTS
                        // ========================================
                        // Cualquier otra petición requiere autenticación (sin importar el rol)
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitFilter, JwtAuthenticationFilter.class)
                // Agregar filtros JWT EN ORDEN - inyectando ObjectMapper configurado
                .addFilter(new JwtAuthenticationFilter(authenticationManager(), usuarioRepository, objectMapper, refreshTokenService))
                .addFilterBefore(new JwtValidationFilter(authenticationManager(), objectMapper), UsernamePasswordAuthenticationFilter.class)

                // Desactivar CSRF (no necesario con JWT)
                .csrf(config -> config.disable())

                // Configurar CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Configurar sesión como STATELESS (sin sesiones HTTP)
                .sessionManagement(management ->
                        management.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(401);
                            response.getWriter().write("{\"error\": \"No autorizado\", \"message\": \"" + authException.getMessage() + "\"}");
                        })
                )
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .build();
    }


}
