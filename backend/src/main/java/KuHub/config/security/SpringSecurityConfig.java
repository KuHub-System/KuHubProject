package KuHub.config.security;

import KuHub.config.security.filter.JwtAuthenticationFilter;
import KuHub.config.security.filter.JwtValidationFilter;
import KuHub.modules.gestionusuario.repository.UsuarioRepository;
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

                        // Endpoints de roles (lectura pública)
                        .requestMatchers(HttpMethod.GET, "/api/v1/roles").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/roles/**").permitAll()

                        // ========================================
                        // ENDPOINTS PROTEGIDOS POR ROL
                        // ========================================
                        // Solo ADMINISTRADOR puede crear/modificar roles
                        .requestMatchers(HttpMethod.POST, "/api/v1/roles").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/roles/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/roles/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/roles/**").hasRole("ADMINISTRADOR")

                        // Usuarios - ADMINISTRADOR tiene acceso total
                        .requestMatchers(HttpMethod.GET, "/api/v1/usuarios").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        //Creador de Usuarios sin ROL
                        .requestMatchers(HttpMethod.POST, "/api/v1/usuarios").permitAll()
                        //.requestMatchers(HttpMethod.POST, "/api/v1/usuarios").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/usuarios/**").hasRole("ADMINISTRADOR")

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
                "http://localhost:5173"
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
}