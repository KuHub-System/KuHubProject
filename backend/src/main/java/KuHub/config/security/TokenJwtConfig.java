package KuHub.config.security;

import io.jsonwebtoken.Jwts;
import javax.crypto.SecretKey;

/**
 * Configuración de constantes para JWT
 * Este archivo se copia TAL CUAL del código del profesor
 * NO requiere adaptaciones
 */
public class TokenJwtConfig {
    
    /**
     * Clave secreta para firmar los tokens JWT
     * Se genera automáticamente usando el algoritmo HS256
     */
    public static final SecretKey SECRET_KEY = Jwts.SIG.HS256.key().build();
    
    /**
     * Prefijo que se agrega al token en el header Authorization
     * Ejemplo: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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