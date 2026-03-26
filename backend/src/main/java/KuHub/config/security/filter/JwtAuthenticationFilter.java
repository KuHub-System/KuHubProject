package KuHub.config.security.filter;

import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
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
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static KuHub.config.security.TokenJwtConfig.*;

/**
 * Filtro que maneja el proceso de autenticación (login)
 * ✅ VERSIÓN CON OBJECTMAPPER INYECTADO
 * ✅ Actualiza ultimoAcceso automáticamente en el backend
 */
public class JwtAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;

    /**
     * Constructor que recibe ObjectMapper configurado
     */
    public JwtAuthenticationFilter(
            AuthenticationManager authenticationManager,
            UsuarioRepository usuarioRepository,
            ObjectMapper objectMapper) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
        setFilterProcessesUrl("/api/v1/auth/login");
        System.out.println("✅ JwtAuthenticationFilter inicializado con ObjectMapper configurado");
    }

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response)
            throws AuthenticationException {

        String email = null;
        String contrasena = null;

        try {
            System.out.println("🔍 [1] Leyendo credenciales del request...");

            Map<String, String> credentials = objectMapper.readValue(
                    request.getInputStream(),
                    Map.class
            );

            email = credentials.get("email");
            contrasena = credentials.get("contrasena");

            System.out.println("🔍 [2] Email recibido: " + email);
            System.out.println("🔍 [3] Contraseña recibida: " + (contrasena != null ? "***" : "null"));

        } catch (IOException e) {
            System.err.println("❌ [ERROR] Error al leer credenciales: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al leer las credenciales del request", e);
        }

        System.out.println("🔍 [4] Creando token de autenticación...");
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(email, contrasena);

        System.out.println("🔍 [5] Intentando autenticar con AuthenticationManager...");
        try {
            Authentication result = authenticationManager.authenticate(authenticationToken);
            System.out.println("✅ [6] Autenticación exitosa!");
            return result;
        } catch (Exception e) {
            System.err.println("❌ [ERROR] Autenticación fallida: " + e.getMessage());
            throw e;
        }
    }

    @Override
    protected void successfulAuthentication(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain,
            Authentication authResult) throws IOException, ServletException {

        try {
            System.out.println(" Entrando a successfulAuthentication...");

            org.springframework.security.core.userdetails.User user =
                    (org.springframework.security.core.userdetails.User) authResult.getPrincipal();

            String username = user.getUsername();
            Collection<? extends GrantedAuthority> roles = authResult.getAuthorities();

            // Generar Token (Igual que antes)
            Claims claims = Jwts.claims()
                    .add("authorities", objectMapper.writeValueAsString(roles))
                    .add("username", username)
                    .build();

            String token = Jwts.builder()
                    .subject(username)
                    .claims(claims)
                    .expiration(new Date(System.currentTimeMillis() + 3600000)) // 1 Hora
                    .issuedAt(new Date())
                    .signWith(SECRET_KEY)
                    .compact();

            // Buscar usuario en BD
            Usuario usuario = usuarioRepository.findByEmailIgnoreCaseAndActivoTrue(username)
                    .orElseThrow(() -> new RuntimeException("Usuario activo no encontrado"));

            // Actualizar ultimoAcceso
            LocalDateTime ahora = LocalDateTime.now();
            usuario.setUltimoAcceso(ahora);
            usuarioRepository.save(usuario);

            // ==========================================
            // ⚠️ AQUÍ ESTÁ EL CAMBIO PARA LIMPIAR EL JSON
            // ==========================================
            Map<String, Object> usuarioLimpio = new HashMap<>();

            // 1. Mapeamos SOLO los campos que quiere el Frontend
            usuarioLimpio.put("idUsuario", usuario.getIdUsuario());
            usuarioLimpio.put("nombreCompleto", usuario.getNombreCompleto());
            usuarioLimpio.put("email", usuario.getEmail());

            // Convertimos el rol a formato legible
            String nombreRol = convertirNombreRolEnumALegible(usuario.getRol().getNombreRol());
            usuarioLimpio.put("nombreRol", nombreRol);

            usuarioLimpio.put("urlFotoPerfil", usuario.getUrlFotoPerfil()); // Ojo: asegúrate que en frontend se lea este key
            usuarioLimpio.put("ultimoAcceso", ahora);

            // ❌ ELIMINAMOS LO QUE NO QUIERES:
            // usuarioData.put("idUsuario", ...);  <- ELIMINADO
            // usuarioData.put("activo", ...);     <- ELIMINADO
            // usuarioData.put("fechaCreacion", ...); <- ELIMINADO

            // Agregando token al header
            response.addHeader(HEADER_STRING, JWT_TOKEN_PREFIX + token);

            // Creando body final de respuesta
            Map<String, Object> body = new HashMap<>();
            body.put("usuario", usuarioLimpio); // Aquí va el objeto limpio
            body.put("token", token);

            // Escribiendo respuesta
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

        System.err.println("❌ [AUTH FAILED] Autenticación fallida: " + failed.getMessage());

        Map<String, String> body = new HashMap<>();
        body.put("message", "Autenticación fallida, email o contraseña inválidos");
        body.put("error", failed.getMessage());

        response.getWriter().write(objectMapper.writeValueAsString(body));
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(CONTENT_TYPE);
    }

    private String convertirNombreRolEnumALegible(String nombreEnum) {
        switch (nombreEnum.toUpperCase()) {
            case "ADMINISTRADOR":
                return "Administrador";
            case "CO_ADMINISTRADOR":
                return "Co-Administrador";
            case "GESTOR_PEDIDOS":
                return "Gestor de Pedidos";
            case "PROFESOR_A_CARGO":
                return "Profesor a Cargo";
            case "DOCENTE":
                return "Docente";
            case "ENCARGADO_BODEGA":
                return "Encargado de Bodega";
            case "ASISTENTE_BODEGA":
                return "Asistente de Bodega";
            default:
                return nombreEnum;
        }
    }
}