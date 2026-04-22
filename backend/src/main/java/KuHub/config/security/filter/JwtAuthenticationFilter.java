package KuHub.config.security.filter;

import KuHub.modules.gestion_usuario.entity.RefreshToken;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
import KuHub.modules.gestion_usuario.service.RefreshTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static KuHub.config.security.TokenJwtConfig.*;

/**
 * Filtro que maneja el proceso de autenticación (login).
 * Soporta "Recordar sesión": si recordarSesion=true en el body,
 * genera un Access Token de 15 min + Refresh Token de 30 días (cookie HttpOnly).
 * Sin recordarSesion: Access Token de 1 hora (comportamiento anterior).
 */
public class JwtAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    private static final String REFRESH_COOKIE_NAME = "kuhub_refresh";
    private static final long ACCESS_TOKEN_CORTO_MS  = 15 * 60 * 1000L;   // 15 minutos
    private static final long ACCESS_TOKEN_NORMAL_MS = 60 * 60 * 1000L;   // 1 hora
    private static final int  REFRESH_COOKIE_DIAS    = 30;

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;
    private final RefreshTokenService refreshTokenService;

    public JwtAuthenticationFilter(
            AuthenticationManager authenticationManager,
            UsuarioRepository usuarioRepository,
            ObjectMapper objectMapper,
            RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
        this.refreshTokenService = refreshTokenService;
        setFilterProcessesUrl("/api/v1/auth/login");
    }

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response)
            throws AuthenticationException {

        String email = null;
        String contrasena = null;

        try {
            Map<String, Object> credentials = objectMapper.readValue(request.getInputStream(), Map.class);
            email = (String) credentials.get("email");
            contrasena = (String) credentials.get("contrasena");

            // Guardar recordarSesion como atributo del request para usarlo en successfulAuthentication
            Object recordar = credentials.get("recordarSesion");
            request.setAttribute("recordarSesion", Boolean.TRUE.equals(recordar));

        } catch (IOException e) {
            throw new RuntimeException("Error al leer las credenciales del request", e);
        }

        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(email, contrasena);
        return authenticationManager.authenticate(authenticationToken);
    }

    @Override
    protected void successfulAuthentication(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain,
            Authentication authResult) throws IOException, ServletException {

        try {
            org.springframework.security.core.userdetails.User user =
                    (org.springframework.security.core.userdetails.User) authResult.getPrincipal();

            String username = user.getUsername();
            Collection<? extends GrantedAuthority> roles = authResult.getAuthorities();

            boolean recordarSesion = Boolean.TRUE.equals(request.getAttribute("recordarSesion"));

            // Determinar duración del Access Token
            long duracionMs = recordarSesion ? ACCESS_TOKEN_CORTO_MS : ACCESS_TOKEN_NORMAL_MS;

            Claims claims = Jwts.claims()
                    .add("authorities", objectMapper.writeValueAsString(roles))
                    .add("username", username)
                    .build();

            String token = Jwts.builder()
                    .subject(username)
                    .claims(claims)
                    .expiration(new Date(System.currentTimeMillis() + duracionMs))
                    .issuedAt(new Date())
                    .signWith(SECRET_KEY)
                    .compact();

            // Buscar usuario y actualizar ultimoAcceso
            Usuario usuario = usuarioRepository.findByEmailIgnoreCaseAndActivoTrue(username)
                    .orElseThrow(() -> new RuntimeException("Usuario activo no encontrado"));

            LocalDateTime ahora = LocalDateTime.now();
            usuario.setUltimoAcceso(ahora);
            usuarioRepository.save(usuario);

            // Generar Refresh Token SIEMPRE (para permitir renovación de tokens expirados)
            // "Recordar sesión" solo afecta la duración del Access Token, no la cookie
            RefreshToken rt = refreshTokenService.crearRefreshToken(usuario);

            Cookie refreshCookie = new Cookie(REFRESH_COOKIE_NAME, rt.getToken());
            refreshCookie.setHttpOnly(true);
            // setSecure(true) cuando haya HTTPS en producción
            // refreshCookie.setSecure(true);
            refreshCookie.setPath("/");
            refreshCookie.setMaxAge(REFRESH_COOKIE_DIAS * 24 * 60 * 60);
            response.addCookie(refreshCookie);

            // Construir respuesta con datos del usuario
            Map<String, Object> usuarioLimpio = new HashMap<>();
            usuarioLimpio.put("idUsuario", usuario.getIdUsuario());
            usuarioLimpio.put("nombreCompleto", usuario.getNombreCompleto());
            usuarioLimpio.put("email", usuario.getEmail());
            usuarioLimpio.put("nombreRol", convertirNombreRolEnumALegible(usuario.getRol().getNombreRol()));
            usuarioLimpio.put("urlFotoPerfil", usuario.getUrlFotoPerfil());
            usuarioLimpio.put("ultimoAcceso", ahora);

            response.addHeader(HEADER_STRING, JWT_TOKEN_PREFIX + token);

            Map<String, Object> body = new HashMap<>();
            body.put("usuario", usuarioLimpio);
            body.put("token", token);
            body.put("recordarSesion", recordarSesion);

            response.getWriter().write(objectMapper.writeValueAsString(body));
            response.setContentType(CONTENT_TYPE);
            response.setStatus(HttpServletResponse.SC_OK);

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            Map<String, String> errorBody = new HashMap<>();
            errorBody.put("error", "Error interno en autenticación");
            response.getWriter().write(objectMapper.writeValueAsString(errorBody));
        }
    }

    @Override
    protected void unsuccessfulAuthentication(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException failed) throws IOException, ServletException {

        Map<String, String> body = new HashMap<>();
        body.put("message", "Autenticación fallida, email o contraseña inválidos");
        body.put("error", failed.getMessage());

        response.getWriter().write(objectMapper.writeValueAsString(body));
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(CONTENT_TYPE);
    }

    private String convertirNombreRolEnumALegible(String nombreEnum) {
        switch (nombreEnum.toUpperCase()) {
            case "ADMINISTRADOR":    return "Administrador";
            case "CO_ADMINISTRADOR": return "Co-Administrador";
            case "GESTOR_PEDIDOS":   return "Gestor de Pedidos";
            case "PROFESOR_A_CARGO": return "Profesor a Cargo";
            case "DOCENTE":          return "Docente";
            case "ENCARGADO_BODEGA": return "Encargado de Bodega";
            case "ASISTENTE_BODEGA": return "Asistente de Bodega";
            default:                 return nombreEnum;
        }
    }
}
