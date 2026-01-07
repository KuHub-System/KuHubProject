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
            System.out.println("✅ [7] Entrando a successfulAuthentication...");

            org.springframework.security.core.userdetails.User user =
                    (org.springframework.security.core.userdetails.User) authResult.getPrincipal();

            String username = user.getUsername();
            Collection<? extends GrantedAuthority> roles = authResult.getAuthorities();

            System.out.println("✅ [8] Username: " + username);
            System.out.println("✅ [9] Roles: " + roles);

            // Crear claims
            System.out.println("✅ [10] Creando claims...");
            Claims claims = Jwts.claims()
                    .add("authorities", objectMapper.writeValueAsString(roles))
                    .add("username", username)
                    .build();

            // Generar token
            System.out.println("✅ [11] Generando token JWT...");
            String token = Jwts.builder()
                    .subject(username)
                    .claims(claims)
                    .expiration(new Date(System.currentTimeMillis() + 3600000))
                    .issuedAt(new Date())
                    .signWith(SECRET_KEY)
                    .compact();

            System.out.println("✅ [12] Token generado: " + token.substring(0, 20) + "...");

            // Buscar usuario en BD
            System.out.println("✅ [13] Buscando usuario en BD con email: " + username);

            if (usuarioRepository == null) {
                System.err.println("❌ [ERROR] UsuarioRepository es NULL!");
                throw new RuntimeException("UsuarioRepository no está inyectado");
            }

            Usuario usuario = usuarioRepository.findByEmailIgnoreCase(username)
                    .orElseThrow(() -> {
                        System.err.println("❌ [ERROR] Usuario no encontrado en BD: " + username);
                        return new RuntimeException("Usuario no encontrado");
                    });

            System.out.println("✅ [14] Usuario encontrado: ID=" + usuario.getIdUsuario());

            // ⭐ ACTUALIZAR ULTIMO ACCESO AUTOMÁTICAMENTE
            System.out.println("✅ [14.1] Actualizando ultimoAcceso...");
            LocalDateTime ahora = LocalDateTime.now();
            usuario.setUltimoAcceso(ahora);
            usuarioRepository.save(usuario);
            System.out.println("✅ [14.2] ultimoAcceso actualizado a: " + ahora);

            // Crear objeto usuario
            System.out.println("✅ [15] Creando objeto usuario para respuesta...");
            Map<String, Object> usuarioData = new HashMap<>();
            usuarioData.put("idUsuario", usuario.getIdUsuario());
            usuarioData.put("nombreCompleto", usuario.getNombreCompleto());
            usuarioData.put("email", usuario.getEmail());

            String nombreRol = convertirNombreRolEnumALegible(usuario.getRol().getNombreRol());
            System.out.println("✅ [16] Rol convertido: " + nombreRol);

            usuarioData.put("nombreRol", nombreRol);
            usuarioData.put("fotoPerfil", usuario.getFotoPerfil());
            usuarioData.put("activo", usuario.getActivo());
            usuarioData.put("fechaCreacion", usuario.getFechaCreacion());
            usuarioData.put("ultimoAcceso", ahora); // ⭐ Usar la fecha actualizada

            System.out.println("✅ [17] Agregando token al header...");
            response.addHeader(HEADER_STRING, JWT_TOKEN_PREFIX + token);

            System.out.println("✅ [18] Creando body de respuesta...");
            Map<String, Object> body = new HashMap<>();
            body.put("token", token);
            body.put("usuario", usuarioData);
            body.put("mensaje", String.format("Autenticación exitosa para %s", username));

            System.out.println("✅ [19] Escribiendo respuesta...");
            response.getWriter().write(objectMapper.writeValueAsString(body));
            response.setContentType(CONTENT_TYPE);
            response.setStatus(HttpServletResponse.SC_OK);

            System.out.println("✅ [20] ¡Login completado exitosamente!");

        } catch (Exception e) {
            System.err.println("❌ [ERROR CRÍTICO] Error en successfulAuthentication: " + e.getMessage());
            e.printStackTrace();

            // Responder con error
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.setContentType("application/json");

            Map<String, String> errorBody = new HashMap<>();
            errorBody.put("error", "Error interno del servidor");
            errorBody.put("mensaje", e.getMessage());

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