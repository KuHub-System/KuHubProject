package KuHub.config.security;

import KuHub.config.security.filter.JwtAuthenticationFilter;
import KuHub.config.security.filter.JwtValidationFilter;
import KuHub.config.security.rate_limiting.RateLimitFilter;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
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

    @Autowired
    public SpringSecurityConfig(AuthenticationConfiguration authenticationConfiguration,
                                UsuarioRepository usuarioRepository,
                                ObjectMapper objectMapper,
                                RateLimitFilter rateLimitFilter) {
        this.authenticationConfiguration = authenticationConfiguration;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
        this.rateLimitFilter = rateLimitFilter;

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

                // 🚀 PRODUCCIÓN (AWS Lightsail)
                "http://52.5.222.79",          // IP estática (Puerto 80 por defecto en React)
                "http://52.5.222.79:80",
                "http://52.5.222.79:8080"      // Por si acaso, la IP con el puerto de Spring
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
                        // ENDPOINTS DE PERMISOS (CRUD por Rol × Módulo)
                        // ========================================
                        // Matriz de permisos: solo ADMINISTRADOR puede verla y editarla
                        .requestMatchers(HttpMethod.GET, "/api/v1/permisos/matrix").hasRole("ADMINISTRADOR")
                        // Permisos de un rol: cualquier usuario autenticado (carga sus propios permisos)
                        .requestMatchers(HttpMethod.GET, "/api/v1/permisos/rol/**").authenticated()
                        // Crear / actualizar permisos: solo ADMINISTRADOR
                        .requestMatchers(HttpMethod.POST, "/api/v1/permisos/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT,  "/api/v1/permisos/**").hasRole("ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE ROLES
                        // ========================================
                        // Endpoints de roles v1 (lectura pública)
                        .requestMatchers(HttpMethod.GET, "/api/v1/roles").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/roles/**").permitAll()

                        // Endpoints de roles v2 con HATEOAS (lectura pública)
                        .requestMatchers(HttpMethod.GET, "/api/v2/roles").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v2/roles/**").permitAll()

                        // Solo ADMINISTRADOR puede crear/modificar roles
                        .requestMatchers(HttpMethod.POST, "/api/v*/roles").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v*/roles/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/roles/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/roles/**").hasRole("ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE USUARIOS
                        // ========================================

                        // 1. UNIVERSAL: Cualquier usuario logueado puede cambiar su PROPIA clave o foto
                        // Se usa .authenticated() para que aplique a Docentes, Asistentes, Admins, etc.
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/usuarios/cambiar-contrasena").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v*/usuarios/actualizar-foto").authenticated()

                        // 2. LECTURA (Listar usuarios): Solo roles que gestionan personal
                        .requestMatchers(HttpMethod.GET, "/api/v*/usuarios/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "PROFESOR_A_CARGO")

                        // 3. GESTIÓN ADMINISTRATIVA (Crear/Editar otros usuarios)
                        .requestMatchers(HttpMethod.POST, "/api/v*/usuarios").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v*/usuarios/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // 4. ELIMINACIÓN: Solo el Administrador principal
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/usuarios/**").hasRole("ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE CATEGORIA
                        // ========================================

                        // Lectura pública
                        .requestMatchers(HttpMethod.GET, "/api/v*/categoria/**").permitAll()

                        // Crear
                        .requestMatchers(HttpMethod.POST, "/api/v*/categoria/**")
                        .hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")

                        // Actualizar (PATCH → lo estás usando)
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/categoria/**")
                        .hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")

                        // Eliminar
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/categoria/**")
                        .hasRole("ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE UNIDAD DE MEDIDA
                        // ========================================

                        // Lectura pública
                        .requestMatchers(HttpMethod.GET, "/api/v*/unidad-medida/**").permitAll()

                        // Crear
                        .requestMatchers(HttpMethod.POST, "/api/v*/unidad-medida/**")
                        .hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")

                        // Actualizar
                        .requestMatchers(HttpMethod.PUT, "/api/v*/unidad-medida/**")
                        .hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")

                        .requestMatchers(HttpMethod.PATCH, "/api/v*/unidad-medida/**")
                        .hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")

                        // Eliminar
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/unidad-medida/**")
                        .hasRole("ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE PRODUCTOS
                        // ========================================
                        // Productos - lectura pública, modificación restringida
                        .requestMatchers(HttpMethod.GET, "/api/v*/producto/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v*/productos/**").permitAll()

                        .requestMatchers(HttpMethod.POST, "/api/v*/producto").hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")
                        .requestMatchers(HttpMethod.POST, "/api/v*/productos").hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")

                        .requestMatchers(HttpMethod.PUT, "/api/v*/producto/**").hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")
                        .requestMatchers(HttpMethod.PUT, "/api/v*/productos/**").hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")

                        .requestMatchers(HttpMethod.DELETE, "/api/v*/producto/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/productos/**").hasRole("ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE INVENTARIO
                        // ========================================
                        // 1. Lectura: Permitida para todos (Público o Autenticados)
                        .requestMatchers(HttpMethod.GET, "/api/v*/inventario/**").permitAll()

                        // 2. Creación (POST): Administradores, Co-Admins, Gestores y Encargados de Bodega
                        .requestMatchers(HttpMethod.POST, "/api/v*/inventario/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "ENCARGADO_BODEGA")

                        // 3. Modificación (PUT): Los mismos que pueden crear (incluyendo el ajuste de stock)
                        .requestMatchers(HttpMethod.PUT, "/api/v*/inventario/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "ENCARGADO_BODEGA")

                        .requestMatchers(HttpMethod.PATCH, "/api/v*/inventario/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "ENCARGADO_BODEGA")

                        // 4. Eliminación (DELETE): Acceso restringido solo a la jerarquía más alta
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/inventario/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE MOVIMIENTOS DE INVENTARIO
                        // ========================================

                        // Centraliza la seguridad solo para las peticiones POST de movimientos
                        .requestMatchers(HttpMethod.POST, "/api/v1/movimiento/**")
                        .hasAnyRole("ADMINISTRADOR", "GESTOR_PEDIDOS", "ENCARGADO_BODEGA", "ASISTENTE_BODEGA")

                        // ========================================
                        // ENDPOINTS DE BODEGA DE TRÁNSITO
                        // ========================================

                        .requestMatchers(HttpMethod.GET, "/api/v*/bodega-transito/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v*/bodega-transito/**").permitAll()

                        .requestMatchers(HttpMethod.PATCH, "/api/v*/bodega-transito/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "ENCARGADO_BODEGA")

                        .requestMatchers(HttpMethod.DELETE, "/api/v*/bodega-transito/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE RECETAS Y DETALLES (REORGANIZADO)
                        // ========================================

                        // 1. LECTURA (GET): Permitido para todos los roles académicos y administrativos
                        .requestMatchers(HttpMethod.GET, "/api/v*/receta/**", "/api/v*/detalle-receta/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "PROFESOR_A_CARGO", "DOCENTE")

                        // 2. CREACIÓN (POST): Solo quienes diseñan el programa académico
                        .requestMatchers(HttpMethod.POST, "/api/v*/receta/**", "/api/v*/detalle-receta/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "PROFESOR_A_CARGO")

                        // 3. EDICIÓN (PUT / PATCH): Solo quienes diseñan el programa académico
                        .requestMatchers(HttpMethod.PUT, "/api/v*/receta/**", "/api/v*/detalle-receta/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "PROFESOR_A_CARGO")

                        .requestMatchers(HttpMethod.PATCH, "/api/v*/receta/**", "/api/v*/detalle-receta/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "PROFESOR_A_CARGO")

                        // 4. ELIMINACIÓN (DELETE): Restringido a la jerarquía más alta
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/receta/**", "/api/v*/detalle-receta/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE BLOQUES HORARIOS
                        // ========================================

                        // 1. Lectura pública: Para que el frontend liste los horarios disponibles
                        .requestMatchers(HttpMethod.GET, "/api/v*/bloque-horario/**").permitAll()

                        // 2. Gestión (Crear, Editar, Borrar): Solo roles administrativos
                        .requestMatchers(HttpMethod.POST, "/api/v*/bloque-horario/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v*/bloque-horario/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/bloque-horario/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/bloque-horario/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE SEMANAS (CALENDARIO ACADÉMICO)
                        // ========================================

                        // 1. Lectura pública: Para que todos puedan ver el calendario del semestre
                        .requestMatchers(HttpMethod.GET, "/api/v*/semanas/**").permitAll()

                        // 2. Gestión (Crear, Editar, Borrar, Generar): Solo roles administrativos
                        .requestMatchers(HttpMethod.POST, "/api/v*/semanas/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v*/semanas/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/semanas/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/semanas/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE SALAS
                        // ========================================

                        // 1. Lectura pública: Para que el frontend pueda listar las salas en los formularios
                        .requestMatchers(HttpMethod.GET, "/api/v*/sala/**").permitAll()

                        // 2. Gestión (Crear, Editar, Borrar): Solo roles administrativos
                        .requestMatchers(HttpMethod.POST, "/api/v*/sala/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v*/sala/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/sala/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/sala/**").hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE SOLICITUDES
                        // ========================================

                        // 1. LECTURA (GET): Todos los roles operativos y académicos
                        .requestMatchers(HttpMethod.GET, "/api/v*/solicitudes/**", "/api/v*/solicitud/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "PROFESOR_A_CARGO", "DOCENTE")

                        // 2. CREACIÓN (POST): Roles operativos que pueden solicitar insumos
                        .requestMatchers(HttpMethod.POST, "/api/v*/solicitudes/**", "/api/v*/solicitud/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "PROFESOR_A_CARGO")

                        // 3. EDICIÓN COMPLETA (PUT) Y PARCIAL (PATCH): Modificar estados, observaciones, etc.
                        .requestMatchers(HttpMethod.PUT, "/api/v*/solicitudes/**", "/api/v*/solicitud/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "PROFESOR_A_CARGO")

                        .requestMatchers(HttpMethod.PATCH, "/api/v*/solicitudes/**", "/api/v*/solicitud/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS", "PROFESOR_A_CARGO")

                        // 4. ELIMINACIÓN (DELETE): Solo jerarquía administrativa (borrado físico o soft-delete)
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/solicitudes/**", "/api/v*/solicitud/**")
                        .hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // ENDPOINTS DE GESTIÓN DE PEDIDOS (NUEVO)
                        // ========================================

                        // 1. LECTURA (GET): Ver historial de pedidos y sus detalles
                        .requestMatchers(HttpMethod.GET,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS")

                        // 2. CREACIÓN (POST): Consolidar nuevos pedidos masivos
                        .requestMatchers(HttpMethod.POST,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS")

                        // 3. EDICIÓN (PUT / PATCH): Modificar estados o corregir cantidades
                        .requestMatchers(HttpMethod.PUT,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS")

                        .requestMatchers(HttpMethod.PATCH,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "GESTOR_PEDIDOS")

                        // 4. ELIMINACIÓN (DELETE): Solo jerarquía administrativa alta
                        .requestMatchers(HttpMethod.DELETE,
                        "/api/v*/pedido/**",
                        "/api/v*/detalle-pedido/**",
                        "/api/v*/pedido-solicitud/**"
                        ).hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR")

                        // ========================================
                        // RESTO DE ENDPOINTS
                        // ========================================
                        // Cualquier otra petición requiere autenticación (sin importar el rol)
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitFilter, JwtAuthenticationFilter.class)
                // Agregar filtros JWT EN ORDEN - inyectando ObjectMapper configurado
                .addFilter(new JwtAuthenticationFilter(authenticationManager(), usuarioRepository, objectMapper))
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