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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import java.io.IOException;
import java.util.*;

import static KuHub.config.security.TokenJwtConfig.*;

/**
 * Filtro que valida el token JWT en cada petición
 * Se ejecuta en TODOS los endpoints protegidos
 * 
 * Este archivo se copia TAL CUAL del código del profesor
 * NO requiere adaptaciones porque no depende de la estructura de tus modelos
 */
public class JwtValidationFilter extends BasicAuthenticationFilter {

    private final ObjectMapper objectMapper;

    /**
     * Constructor que recibe el AuthenticationManager y ObjectMapper
     */
    public JwtValidationFilter(AuthenticationManager authenticationManager, ObjectMapper objectMapper) {
        super(authenticationManager);
        this.objectMapper = objectMapper;
    }

    /**
     * Filtro que valida el token JWT y lo RENUEVA automáticamente en cada petición activa.
     * ✅ Implementa Sliding Expiration (30 minutos de gracia desde el último acceso).
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        String header = request.getHeader(HEADER_STRING);

        if (header == null || !header.startsWith(JWT_TOKEN_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.replace(JWT_TOKEN_PREFIX, "");

        try {
            // 1. Validar el token actual
            Claims claims = Jwts.parser()
                    .verifyWith(SECRET_KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String username = claims.getSubject();
            Object authoritiesClaim = claims.get("authorities");

            Collection<? extends GrantedAuthority> authorities = Arrays.asList(
                    objectMapper.readValue(authoritiesClaim.toString().getBytes(), SimpleGrantedAuthority[].class)
            );

            // =========================================================
            // ✨ LÓGICA DE RENOVACIÓN AUTOMÁTICA (SLIDING EXPIRATION)
            // =========================================================
            // Si el token es válido, generamos uno nuevo con 30 minutos frescos (1,800,000 ms)
            String newToken = Jwts.builder()
                    .subject(username)
                    .claims(claims)
                    .expiration(new Date(System.currentTimeMillis() + 3600000)) // 1 Hora desde esta petición
                    .issuedAt(new Date())
                    .signWith(SECRET_KEY)
                    .compact();

            // Agregamos el nuevo token al header de la respuesta para que el frontend lo guarde
            response.addHeader(HEADER_STRING, JWT_TOKEN_PREFIX + newToken);
            // También lo exponemos para que CORS permita al navegador leer este header específico
            response.addHeader("Access-Control-Expose-Headers", HEADER_STRING);
            // =========================================================

            UsernamePasswordAuthenticationToken authenticationToken =
                    new UsernamePasswordAuthenticationToken(username, null, authorities);

            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            chain.doFilter(request, response);

        } catch (JwtException | IOException e) {
            System.err.println("❌ [JWT ERROR] " + e.getMessage());
            e.printStackTrace();
            
            Map<String, String> body = new HashMap<>();
            body.put("message", "El token ha expirado o es inválido");
            body.put("error", e.getMessage());

            response.getWriter().write(objectMapper.writeValueAsString(body));
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(CONTENT_TYPE);
        }
    }
}