package KuHub.config.security;

import KuHub.config.security.filter.JwtAuthenticationFilter;
import KuHub.config.security.filter.JwtValidationFilter;
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
 * Creada desde cero adaptada a tu proyecto KuHub
 */
@Configuration
public class SpringSecurityConfig {

    @Autowired
    private AuthenticationConfiguration authenticationConfiguration;

    /**
     * Bean que proporciona el codificador de contraseñas BCrypt
     * Se usa para hashear las contraseñas en crear() y actualizar()
     * Y para validar contraseñas en el login
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Bean que proporciona el AuthenticationManager
     * Necesario para los filtros JWT
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

                        // TEMPORAL PARA CREAR USUARIO SIN TENER PERMISO
                        //.requestMatchers(HttpMethod.POST, "/api/v1/usuarios").permitAll()
                        
                        // Endpoints de roles (puedes ajustar según necesites)
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
                        //SE DESACTIVA SI SE QUIERE CREAR USUARIO SIN TENER PERMISO
                        .requestMatchers(HttpMethod.POST, "/api/v1/usuarios").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        
                        // ========================================
                        // RESTO DE ENDPOINTS
                        // ========================================
                        // Cualquier otra petición requiere autenticación (sin importar el rol)
                        .anyRequest().authenticated()
                )
                // Agregamos el filtro de autenticación (login)
                .addFilter(new JwtAuthenticationFilter(authenticationManager()))
                
                // Agregamos el filtro de validación (verifica el token en cada petición)
                .addFilter(new JwtValidationFilter(authenticationManager()))
                
                // Desactivamos CSRF porque usamos JWT (API REST stateless)
                .csrf(config -> config.disable())
                
                // Configuramos CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                
                // Configuramos la sesión como STATELESS (sin sesiones HTTP)
                // La autenticación se maneja solo con JWT
                .sessionManagement(management ->
                        management.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .build();
    }

    /**
     * Configuración de CORS
     * ⚠️ CORREGIDO: No se puede usar allowedOrigins("*") con allowCredentials(true)
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // IMPORTANTE: Especificamos el origen exacto del frontend
        // NO usamos "*" porque no es compatible con allowCredentials(true)
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173"));
        
        // Métodos HTTP permitidos
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        
        // Headers permitidos
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        
        // Permitimos el envío de credenciales (cookies, headers de autenticación)
        configuration.setAllowCredentials(true);
        
        // Headers que el frontend puede leer de la respuesta
        configuration.setExposedHeaders(Arrays.asList("Authorization"));

        // Aplicamos la configuración a todas las rutas
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}