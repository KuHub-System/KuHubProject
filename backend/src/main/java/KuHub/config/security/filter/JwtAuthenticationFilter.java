package KuHub.config.security.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static KuHub.config.security.TokenJwtConfig.*;

/**
 * Filtro que maneja el proceso de autenticación (login)
 * Se ejecuta cuando el usuario hace POST a /login
 * 
 * ⚠️ ADAPTADO DE LA VERSIÓN DEL PROFESOR:
 * - Recibe JSON con "email" y "contrasena" (no "username" y "password")
 * - Procesa las credenciales de tu LoginRequestDTO
 */
public class JwtAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    private AuthenticationManager authenticationManager;

    public JwtAuthenticationFilter(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    /**
     * Método que se ejecuta cuando llega una petición POST a /login
     * Intenta autenticar al usuario con las credenciales enviadas
     */
    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) 
            throws AuthenticationException {
        
        String email = null;
        String contrasena = null;

        try {
            // ADAPTACIÓN: Leemos el JSON que viene en el body
            // Esperamos un objeto con { "email": "...", "contrasena": "..." }
            Map<String, String> credentials = new ObjectMapper().readValue(
                    request.getInputStream(), 
                    Map.class
            );
            
            email = credentials.get("email");
            contrasena = credentials.get("contrasena");
            
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Error al leer las credenciales del request", e);
        }

        // Creamos el token de autenticación con email y contraseña
        // NOTA: Aquí usamos email como "username" porque así lo espera Spring Security
        UsernamePasswordAuthenticationToken authenticationToken = 
                new UsernamePasswordAuthenticationToken(email, contrasena);

        // Retornamos el resultado de la autenticación
        // Esto internamente llamará a JpaUserDetailsService.loadUserByUsername(email)
        return authenticationManager.authenticate(authenticationToken);
    }

    /**
     * Método que se ejecuta si la autenticación fue exitosa
     * Genera el token JWT y lo retorna en la respuesta
     */
    @Override
    protected void successfulAuthentication(
            HttpServletRequest request, 
            HttpServletResponse response, 
            FilterChain chain, 
            Authentication authResult) throws IOException, ServletException {
        
        // Obtenemos el usuario autenticado
        org.springframework.security.core.userdetails.User user = 
                (org.springframework.security.core.userdetails.User) authResult.getPrincipal();
        
        String username = user.getUsername(); // En tu caso, es el email
        Collection<? extends GrantedAuthority> roles = authResult.getAuthorities();

        // Creamos los claims del token (información adicional que va dentro del JWT)
        Claims claims = Jwts.claims()
                .add("authorities", new ObjectMapper().writeValueAsString(roles))
                .add("username", username)
                .build();

        // Generamos el token JWT
        String token = Jwts.builder()
                .subject(username)
                .claims(claims)
                .expiration(new Date(System.currentTimeMillis() + 3600000)) // 1 hora de validez
                .issuedAt(new Date())
                .signWith(SECRET_KEY)
                .compact();

        // Agregamos el token al header de la respuesta
        response.addHeader(HEADER_STRING, JWT_TOKEN_PREFIX + token);

        // Creamos el body de la respuesta JSON
        Map<String, String> body = new HashMap<>();
        body.put("token", token);
        body.put("username", username);
        body.put("message", String.format("Autenticación exitosa para %s", username));

        // Escribimos la respuesta
        response.getWriter().write(new ObjectMapper().writeValueAsString(body));
        response.setContentType(CONTENT_TYPE);
        response.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * Método que se ejecuta si la autenticación falla
     */
    @Override
    protected void unsuccessfulAuthentication(
            HttpServletRequest request, 
            HttpServletResponse response, 
            AuthenticationException failed) throws IOException, ServletException {
        
        Map<String, String> body = new HashMap<>();
        body.put("message", "Autenticación fallida, email o contraseña inválidos");
        body.put("error", failed.getMessage());
        
        response.getWriter().write(new ObjectMapper().writeValueAsString(body));
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(CONTENT_TYPE);
    }
}