package KuHub.modules.gestion_usuario.controller;

import KuHub.modules.gestion_usuario.entity.RefreshToken;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.exceptions.GestionUsuarioException;
import KuHub.modules.gestion_usuario.service.RefreshTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

import static KuHub.config.security.TokenJwtConfig.*;

/**
 * Controlador para endpoints de autenticación que requieren lógica de servicio.
 * - POST /api/v1/auth/refresh → renueva el Access Token usando el Refresh Token de la cookie
 * - POST /api/v1/auth/logout  → revoca el Refresh Token y limpia la cookie
 * ✅ En uso: consumido por el interceptor Axios del frontend (axios.ts).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    /**Services*/
    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String REFRESH_COOKIE_NAME = "kuhub_refresh";
    private static final long ACCESS_TOKEN_MS = 15 * 60 * 1000L;  // 15 minutos

    /**
     * Renueva el Access Token usando el Refresh Token almacenado en cookie HttpOnly.
     * El frontend llama este endpoint cuando recibe un 401.
     * ✅ En uso: interceptor de Axios en config/axios.ts.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenValue = extraerCookie(request, REFRESH_COOKIE_NAME);

        if (refreshTokenValue == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "No hay refresh token"));
        }

        try {
            RefreshToken rt = refreshTokenService.validar(refreshTokenValue);
            Usuario usuario = rt.getUsuario();

            // Construir authorities del usuario (un solo rol como ROLE_<nombre>)
            String rol = "ROLE_" + usuario.getRol().getNombreRol().toUpperCase();
            List<Map<String, String>> authorities = List.of(Map.of("authority", rol));
            String authoritiesJson = objectMapper.writeValueAsString(authorities);

            // Generar nuevo Access Token de 15 minutos
            Claims claims = Jwts.claims()
                    .add("authorities", authoritiesJson)
                    .add("username", usuario.getEmail())
                    .build();

            String newAccessToken = Jwts.builder()
                    .subject(usuario.getEmail())
                    .claims(claims)
                    .expiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_MS))
                    .issuedAt(new Date())
                    .signWith(SECRET_KEY)
                    .compact();

            log.info("Access token renovado para usuario id={}", usuario.getIdUsuario());
            return ResponseEntity.status(HttpStatus.OK)
                    .body(Map.of("token", newAccessToken));

        } catch (GestionUsuarioException e) {
            limpiarCookie(response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        } catch (IOException e) {
            log.error("Error al serializar authorities en /refresh", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error interno al renovar sesión"));
        }
    }

    /**
     * Cierra la sesión: revoca el Refresh Token y elimina la cookie.
     * ✅ En uso: cerrarSesionService en auth-service.ts.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenValue = extraerCookie(request, REFRESH_COOKIE_NAME);

        if (refreshTokenValue != null) {
            try {
                RefreshToken rt = refreshTokenService.validar(refreshTokenValue);
                refreshTokenService.revocarTodosPorUsuario(rt.getUsuario().getIdUsuario());
            } catch (GestionUsuarioException e) {
                // Token ya inválido — igual limpiamos la cookie
                log.warn("Logout con refresh token inválido: {}", e.getMessage());
            }
        }

        limpiarCookie(response);
        return ResponseEntity.status(HttpStatus.OK)
                .body(Map.of("message", "Sesión cerrada correctamente"));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String extraerCookie(HttpServletRequest request, String nombre) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> nombre.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private void limpiarCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
