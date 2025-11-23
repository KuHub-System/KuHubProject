package KuHub.config.security.service;

import KuHub.modules.gestionusuario.entity.Usuario;
import KuHub.modules.gestionusuario.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Servicio que permite realizar la validación del login del usuario
 * Implementa la interfaz UserDetailsService de Spring Security
 * 
 * ⚠️ ADAPTADO DE LA VERSIÓN DEL PROFESOR:
 * - Usa findByEmailIgnoreCase en vez de findByUsername
 * - Usa usuario.getContrasena() en vez de user.getPassword()
 * - Usa usuario.getActivo() en vez de user.getEnabled()
 * - Usa usuario.getRol() (singular) en vez de user.getRoles() (lista)
 * - Agrega prefijo "ROLE_" porque tu BD no lo tiene
 */
@Service
public class JpaUserDetailsService implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    /**
     * Método principal que Spring Security llama para autenticar
     * @param username En tu caso, es el EMAIL del usuario
     * @return UserDetails con la información del usuario autenticado
     */
    @Transactional(readOnly = true)
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        
        // ADAPTACIÓN 1: Buscamos por EMAIL en vez de username
        // El parámetro "username" de Spring Security en tu caso contiene el email
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        String.format("No se encontró usuario con email '%s'", username)
                ));

        // ADAPTACIÓN 2: Convertimos el ROL único a lista de GrantedAuthority
        // Tu Usuario tiene UN SOLO rol (no lista), así que creamos una lista con ese único rol
        List<GrantedAuthority> grantedAuthorities = new ArrayList<>();
        
        // ADAPTACIÓN 3: Agregamos el prefijo "ROLE_" porque tu BD no lo tiene
        // Tu BD tiene: "ADMINISTRADOR" → Spring Security necesita: "ROLE_ADMINISTRADOR"
        String nombreRolConPrefijo = "ROLE_" + usuario.getRol().getNombreRol().toUpperCase();
        grantedAuthorities.add(new SimpleGrantedAuthority(nombreRolConPrefijo));

        // ADAPTACIÓN 4: Retornamos el UserDetails usando los campos de tu entidad Usuario
        return new org.springframework.security.core.userdetails.User(
                usuario.getEmail(),           // username (en tu caso es el email)
                usuario.getContrasena(),      // password (en tu caso es "contrasena")
                usuario.getActivo(),          // enabled (en tu caso es "activo")
                true,                         // accountNonExpired
                true,                         // credentialsNonExpired
                true,                         // accountNonLocked
                grantedAuthorities           // authorities (roles)
        );
    }
}