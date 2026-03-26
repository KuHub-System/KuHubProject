package KuHub.config.security.service;

import KuHub.modules.gestion_usuario.dtos.dtofilter.pro.UserAuthProjection;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
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
        // ADAPTACIÓN: Usamos findUserAuth en lugar de findByEmailIgnoreCase
        // Esto evita traer objetos innecesarios, solo trae lo que definiste en el SQL.
        UserAuthProjection data = usuarioRepository.findUserAuth(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        String.format("No se encontró usuario con identificador '%s'", username)
                ));

        // Construimos la lista de autoridades basada en el String nombreRol de la proyección
        List<GrantedAuthority> grantedAuthorities = new ArrayList<>();
        // Normalizamos el nombre del rol: Mayúsculas y reemplaza guiones por guiones bajos
        // para que coincida con los hasRole("CO_ADMINISTRADOR") de SpringSecurityConfig
        String nombreRolLimpio = data.getNombreRol().toUpperCase().replace("-", "_").replace(" ", "_");
        String nombreRolConPrefijo = "ROLE_" + nombreRolLimpio;
        grantedAuthorities.add(new SimpleGrantedAuthority(nombreRolConPrefijo));

        // Retornamos el usuario estándar de Spring usando los datos de tu proyección
        return new org.springframework.security.core.userdetails.User(
                data.getEmail(),           // username
                data.getContrasena(),      // password (hash recuperado de la BD)
                data.getActivo(),          // enabled
                true,                      // accountNonExpired
                true,                      // credentialsNonExpired
                true,                      // accountNonLocked
                grantedAuthorities         // authorities
        );
    }
}