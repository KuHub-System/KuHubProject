package KuHub.config.security;

import KuHub.config.security.filter.JwtAuthenticationFilter;
import KuHub.config.security.filter.JwtValidationFilter;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
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

    @Autowired
    private AuthenticationConfiguration authenticationConfiguration;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ObjectMapper objectMapper;

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
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000"
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
                        .requestMatchers(HttpMethod.POST, "/login").permitAll()
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

                        // Permite que cualquier usuario autenticado cambie su propia contraseña
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/usuarios/cambiar-contrasena").authenticated()

                        // ADMINISTRADOR tiene acceso total (v1 y v2)
                        .requestMatchers(HttpMethod.GET, "/api/v*/usuarios").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/v*/usuarios/**").hasRole("ADMINISTRADOR")

                        // ⚠️ TEMPORAL: Creador de Usuarios sin ROL (para desarrollo)
                        // En producción, cambiar a .hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/api/v*/usuarios").permitAll()

                        .requestMatchers(HttpMethod.PUT, "/api/v*/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v*/usuarios/**").hasRole("ADMINISTRADOR")

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
                        // Inventario - lectura pública, modificación restringida
                        .requestMatchers(HttpMethod.GET, "/api/v*/inventario/**").permitAll()

                        .requestMatchers(HttpMethod.POST, "/api/v*/inventario/**").hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")
                        .requestMatchers(HttpMethod.PUT, "/api/v*/inventario/**").hasAnyRole("ADMINISTRADOR", "ENCARGADO_BODEGA")
                        .requestMatchers(HttpMethod.DELETE, "/api/v*/inventario/**").hasRole("ADMINISTRADOR")

                        // ========================================
                        // RESTO DE ENDPOINTS
                        // ========================================
                        // Cualquier otra petición requiere autenticación (sin importar el rol)
                        .anyRequest().authenticated()
                )
                // Agregar filtros JWT EN ORDEN - inyectando ObjectMapper configurado
                .addFilter(new JwtAuthenticationFilter(authenticationManager(), usuarioRepository, objectMapper))
                .addFilter(new JwtValidationFilter(authenticationManager()))

                // Desactivar CSRF (no necesario con JWT)
                .csrf(config -> config.disable())

                // Configurar CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Configurar sesión como STATELESS (sin sesiones HTTP)
                .sessionManagement(management ->
                        management.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .build();
    }


}