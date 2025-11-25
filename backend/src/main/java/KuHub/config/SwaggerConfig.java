package KuHub.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        Contact contact = new Contact();
        contact.setName("KuHub Development Team");
        contact.setEmail("contact@kuhub.com");
        contact.setUrl("https://kuhub.com");

        Server localServer = new Server();
        localServer.setUrl("http://localhost:8080");
        localServer.setDescription("Servidor Local de Desarrollo");

        Server productionServer = new Server();
        productionServer.setUrl("https://api.kuhub.com");
        productionServer.setDescription("Servidor de Producción");

        // Definir el esquema de seguridad JWT
        SecurityScheme securityScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .name("Authorization")
                .description("Ingresa el token JWT obtenido del endpoint /login");

        // Crear el requisito de seguridad
        SecurityRequirement securityRequirement = new SecurityRequirement()
                .addList("Bearer Authentication");

        return new OpenAPI()
                .info(new Info()
                        .title("KuHub API - Sistema de Gestión Integral")
                        .version("2.0.0")
                        .description("API RESTful con HATEOAS para gestión de productos, inventario, usuarios y roles. " +
                                "\n\n**Autenticación:** Esta API utiliza JWT Bearer tokens. " +
                                "\n1. Primero, obtén un token usando el endpoint `/login` (POST) con tu email y contraseña. " +
                                "\n2. Copia el token de la respuesta. " +
                                "\n3. Haz clic en el botón 'Authorize' 🔒 arriba y pega el token. " +
                                "\n4. Ahora puedes probar todos los endpoints protegidos. " +
                                "\n\nEsta versión incluye hypermedia links (HATEOAS) para facilitar la navegación entre recursos.")
                        .contact(contact)
                        .termsOfService("https://kuhub.com/terms")
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html"))
                        .summary("API unificada de KuHub con soporte HATEOAS y JWT")
                )
                .servers(List.of(localServer, productionServer))
                // Agregar componentes de seguridad
                .components(new Components()
                        .addSecuritySchemes("Bearer Authentication", securityScheme))
                // Agregar requisito de seguridad global
                .addSecurityItem(securityRequirement);
    }
}