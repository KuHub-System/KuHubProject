package KuHub.config.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Configuración separada para @PreAuthorize / @PostAuthorize.
 * Debe estar en clase aparte de SpringSecurityConfig para evitar
 * problemas de proxy circular con los beans de SecurityFilterChain.
 */
@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class MethodSecurityConfig {
}
