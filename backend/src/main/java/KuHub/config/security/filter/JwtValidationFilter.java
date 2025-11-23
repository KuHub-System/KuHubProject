package KuHub.config.security.filter;

import KuHub.config.security.SimpleGrantedAuthorityJsonCreator;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import static KuHub.config.security.TokenJwtConfig.*;

/**
 * Filtro que valida el token JWT en cada petición
 * Se ejecuta en TODOS los endpoints protegidos
 * 
 * Este archivo se copia TAL CUAL del código del profesor
 * NO requiere adaptaciones porque no depende de la estructura de tus modelos
 */
public class JwtValidationFilter extends BasicAuthenticationFilter {

    /**
     * Constructor que recibe el AuthenticationManager
     */
    public JwtValidationFilter(AuthenticationManager authenticationManager) {
        super(authenticationManager);
    }

    /**
     * Método que se ejecuta en cada petición para validar el token
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        
        // Obtenemos el header Authorization
        String header = request.getHeader(HEADER_STRING);

        // Si no hay header o no empieza con "Bearer ", es un recurso público (login, register, etc.)
        if (header == null || !header.startsWith(JWT_TOKEN_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }
        
        // Quitamos el prefijo "Bearer " del token
        String token = header.replace(JWT_TOKEN_PREFIX, "");

        try {
            // Parseamos y validamos el token usando la SECRET_KEY
            Claims claims = Jwts.parser()
                    .verifyWith(SECRET_KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            // Extraemos el username (en tu caso será el email)
            String username = claims.getSubject();

            // Obtenemos los roles del claim "authorities"
            Object authoritiesClaim = claims.get("authorities");

            // Convertimos el JSON de authorities a una colección de GrantedAuthority
            Collection<? extends GrantedAuthority> authorities = Arrays.asList(
                    new ObjectMapper()
                            .addMixIn(SimpleGrantedAuthority.class, SimpleGrantedAuthorityJsonCreator.class)
                            .readValue(authoritiesClaim.toString().getBytes(), SimpleGrantedAuthority[].class)
            );

            // Creamos el objeto de autenticación de Spring Security
            UsernamePasswordAuthenticationToken authenticationToken = 
                    new UsernamePasswordAuthenticationToken(username, null, authorities);
            
            // Lo guardamos en el contexto de seguridad
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            
            // Continuamos con la cadena de filtros
            chain.doFilter(request, response);

        } catch (JwtException e) {
            // Si el token es inválido, expirado, o manipulado, respondemos con error 401
            Map<String, String> body = new HashMap<>();
            body.put("message", "The Token is not valid");
            body.put("error", e.getMessage());

            response.getWriter().write(new ObjectMapper().writeValueAsString(body));
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(CONTENT_TYPE);
        }
    }
}