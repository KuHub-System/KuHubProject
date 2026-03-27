package KuHub.config.security;

import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * Configuración de constantes para JWT.
 *
 * SECRET_KEY usa una clave FIJA para que los tokens sigan siendo válidos
 * después de reinicios del backend.
 *
 * La clave se lee del env var JWT_SECRET si está definido (recomendado en producción),
 * o usa la clave embebida como fallback.
 */
public class TokenJwtConfig {

    private static final String SECRET_STRING;

    static {
        String env = System.getenv("JWT_SECRET");
        // La clave embebida tiene 52 chars (> 32 bytes requeridos por HS256)
        SECRET_STRING = (env != null && env.length() >= 32)
                ? env
                : "KuHub-Fixed-JWT-Secret-Key-2024-Production-Safe!!";
    }

    /**
     * Clave secreta FIJA para firmar los tokens JWT.
     * Al ser fija, los tokens siguen siendo válidos tras reiniciar el backend.
     */
    public static final SecretKey SECRET_KEY =
            Keys.hmacShaKeyFor(SECRET_STRING.getBytes(StandardCharsets.UTF_8));

    /**
     * Prefijo que se agrega al token en el header Authorization
     */
    public static final String JWT_TOKEN_PREFIX = "Bearer ";

    /**
     * Nombre del header HTTP donde viaja el token
     */
    public static final String HEADER_STRING = "Authorization";

    /**
     * Tipo de contenido de las respuestas
     */
    public static final String CONTENT_TYPE = "application/json";
}
