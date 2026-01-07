package KuHub.modules.gestion_usuario.repository;

import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.entity.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

/**
 * Repository para la entidad Usuario
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    /**
     * Busca un usuario por email
     */
    Optional<Usuario> findByEmail(String email);

    /**
     * Busca un usuario por email ignorando mayúsculas/minúsculas
     */
    Optional<Usuario> findByEmailIgnoreCase(String email);

    /**
     * Busca un usuario por username
     */
    Optional<Usuario> findByUsername(String username);

    /**
     * Verifica si existe un usuario con ese email
     */
    boolean existsByEmail(String email);

    /**
     * Verifica si existe un usuario con ese username
     */
    boolean existsByUsername(String username);

    boolean existsUsuarioByIdUsuarioAndActivoTrue(Integer idUsuario);

    /**
     * Obtiene todos los usuarios activos
     */
    List<Usuario> findByActivoTrue();

    /**
     * Obtiene usuarios por rol
     */
    List<Usuario> findByRol(Rol rol);

    /**
     * Obtiene usuarios activos por rol
     */
    List<Usuario> findByRolAndActivoTrue(Rol rol);

    /**
     * Obtiene todos los usuarios de un rol
     * */
    List<Usuario> findAllByRol_IdRol(Integer idRol);

    /**
     * Busca usuarios por nombre (búsqueda parcial)
     */
    @Query("SELECT u FROM Usuario u WHERE " +
           "LOWER(u.primerNombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
           "LOWER(u.segundoNombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
           "LOWER(u.apellidoPaterno) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
           "LOWER(u.apellidoMaterno) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :busqueda, '%'))")
    List<Usuario> buscarPorNombreOEmail(@Param("busqueda") String busqueda);

    /**
     * Actualiza el último acceso del usuario
     */
    @Modifying
    @Query("UPDATE Usuario u SET u.ultimoAcceso = :fecha WHERE u.idUsuario = :idUsuario")
    void actualizarUltimoAcceso(@Param("idUsuario") Integer idUsuario, @Param("fecha") LocalDateTime fecha);

    /**
     * Obtiene todos los usuarios ordenados por fecha de creación descendente
     */
    List<Usuario> findAllByOrderByFechaCreacionDesc();

    /**
     * Cuenta usuarios activos
     */
    long countByActivoTrue();

    /**
     * Cuenta usuarios por rol
     */
    long countByRol(Rol rol);

    /**
     * Verificar si existe un usuario con el email dado
     */
    boolean existsByEmailIgnoreCase(String email);


}