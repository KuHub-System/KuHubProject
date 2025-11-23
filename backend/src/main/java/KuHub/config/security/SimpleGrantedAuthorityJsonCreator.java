package KuHub.config.security;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Clase Mixed que permite realizar el mapeo entre la Clase Role y la Clase Authorities
 * Esto es un tipo de diccionario de traducción para Jackson (ObjectMapper)
 * 
 * Esta clase se copia TAL CUAL del código del profesor
 * NO requiere adaptaciones
 * 
 * Es necesaria para que Spring Security pueda deserializar correctamente
 * los roles que vienen dentro del token JWT
 */
public abstract class SimpleGrantedAuthorityJsonCreator {

    /**
     * Mapea la propiedad 'authority' del JSON al rol de Spring Security
     * @param role El nombre del rol (ej: "ROLE_ADMIN")
     */
    @JsonCreator
    public SimpleGrantedAuthorityJsonCreator(@JsonProperty("authority") String role) {
        // Constructor abstracto - solo define el mapeo
    }
}