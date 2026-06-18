package KuHub.config.security.permission;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registra el {@link DynamicPermissionInterceptor} para toda la API.
 *
 * Los interceptores corren DESPUÉS de la cadena de filtros de seguridad, por lo que el
 * SecurityContext (autenticación + authorities del JWT) ya está poblado cuando se evalúa
 * el permiso dinámico.
 */
@Configuration
public class PermissionWebConfig implements WebMvcConfigurer {

    private final DynamicPermissionInterceptor dynamicPermissionInterceptor;

    @Autowired
    public PermissionWebConfig(DynamicPermissionInterceptor dynamicPermissionInterceptor) {
        this.dynamicPermissionInterceptor = dynamicPermissionInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(dynamicPermissionInterceptor)
                .addPathPatterns("/api/**");
    }
}
