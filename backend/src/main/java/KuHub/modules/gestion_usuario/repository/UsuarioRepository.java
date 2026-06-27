package KuHub.modules.gestion_usuario.repository;

import KuHub.modules.gestion_usuario.dtos.dtofilter.pro.UserAuthProjection;
import KuHub.modules.gestion_usuario.dtos.response.proyection.UserIdNameView;
import KuHub.modules.gestion_usuario.dtos.response.proyection.UsersToManageCourseOrSectionView;
import KuHub.modules.gestion_usuario.dtos.UsersView;
import KuHub.modules.gestion_usuario.dtos.UserStatusView;
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

    @Query("SELECT u FROM Usuario u WHERE LOWER(u.username) = LOWER(:identifier) OR LOWER(u.email) = LOWER(:identifier)")
    Optional<Usuario> findByIdentifier(@Param("identifier") String identifier);


    /**
     * Obtiene la lista de usuarios con formato para el frontend y paginación manual.
     */
    @Query(value =
        "SELECT " +
        "    u.url_foto_perfil AS urlFotoPerfil, " +
        "    CONCAT_WS(' ', " +
        "        NULLIF(TRIM(u.p_nombre), ''), " +
        "        NULLIF(TRIM(u.s_nombre), ''), " +
        "        NULLIF(TRIM(u.app_paterno), ''), " +
        "        NULLIF(TRIM(u.app_materno), '') " +
        "    ) AS nombreCompleto, " +
        "    u.email AS email, " +
        "    u.username AS username, " +
        "    u.id_usuario AS idUsuario, " +
        "    u.id_rol AS idRol, " +
        "    INITCAP(REPLACE(CAST(r.nombre_rol AS TEXT), '_', '-')) AS rolFormateado, " +
        "    u.activo AS activo, " +
        "    u.ultimo_acceso AS ultimoAcceso, " +
        "    u.p_nombre AS primerNombre, " + // Alias sincronizado con UsersView
        "    u.s_nombre AS segundoNombre, " +
        "    u.app_paterno AS apellidoPaterno, " +
        "    u.app_materno AS apellidoMaterno " +
        "FROM usuario u " +
        "JOIN rol r ON r.id_rol = u.id_rol " +
        "WHERE u.id_usuario NOT IN (1, 2, 3, 4, 5, 6, 7) " +
        "AND u.activo = true " +
        // Filtro opcional por rol: si rolesCsv viene vacío/null, no filtra
        "AND (:rolesCsv IS NULL OR :rolesCsv = '' OR u.id_rol = ANY(string_to_array(:rolesCsv, ',')::int[])) " +
        // Orden estable por nombre + id (id desempata → paginación OFFSET determinística)
        "ORDER BY nombreCompleto ASC, u.id_usuario ASC " +
        "LIMIT :limit OFFSET :offset",
        nativeQuery = true)
    List<UsersView> findUsuariosParaFrontend(
            @Param("limit") int limit,
            @Param("offset") int offset,
            @Param("rolesCsv") String rolesCsv
    );

    /**
     * Cuenta el total de usuarios (excluyendo sistemas) para el cálculo de páginas totales.
     */
    @Query(value = "SELECT COUNT(*) FROM usuario u " +
            "WHERE u.id_usuario NOT IN (1, 2, 3, 4, 5, 6, 7) " +
            "AND u.activo = true " +
            "AND (:rolesCsv IS NULL OR :rolesCsv = '' OR u.id_rol = ANY(string_to_array(:rolesCsv, ',')::int[]))",
            nativeQuery = true)
    long countUsuariosParaFrontend(@Param("rolesCsv") String rolesCsv);

    /**
     * Busca usuarios por nombre o email con filtros de sistema y paginación.
     */
    @Query(value =
        "SELECT " +
            "    u.url_foto_perfil AS \"urlFotoPerfil\", " +
            "    CONCAT_WS(' ', " +
            "        NULLIF(TRIM(u.p_nombre), ''), " +
            "        NULLIF(TRIM(u.s_nombre), ''), " +
            "        NULLIF(TRIM(u.app_paterno), ''), " +
            "        NULLIF(TRIM(u.app_materno), '') " +
            "    ) AS \"nombreCompleto\", " +
            "    u.email AS \"email\", " +
            "    u.username AS \"username\", " +
            "    u.id_usuario AS \"idUsuario\", " +
            "    u.id_rol AS \"idRol\", " +
            "    INITCAP(REPLACE(CAST(r.nombre_rol AS TEXT), '_', '-')) AS \"rolFormateado\", " +
            "    u.activo AS \"activo\", " +
            "    u.ultimo_acceso AS \"ultimoAcceso\", " +
            "    u.p_nombre AS \"primerNombre\", " +
            "    u.s_nombre AS \"segundoNombre\", " +
            "    u.app_paterno AS \"apellidoPaterno\", " +
            "    u.app_materno AS \"apellidoMaterno\" " +
            "FROM usuario u " +
            "JOIN rol r ON r.id_rol = u.id_rol " +
            "WHERE u.id_usuario NOT IN (1, 2, 3, 4, 5, 6, 7) " +
            "AND u.activo = true " +
                "AND (" +
                "    CONCAT_WS(' ', " + // Búsqueda por nombre completo concatenado
                "        NULLIF(TRIM(u.p_nombre), ''), " +
                "        NULLIF(TRIM(u.s_nombre), ''), " +
                "        NULLIF(TRIM(u.app_paterno), ''), " +
                "        NULLIF(TRIM(u.app_materno), '') " +
                "    ) ILIKE CONCAT('%', :term, '%') OR " +
                "    u.email ILIKE CONCAT('%', :term, '%') " +
                ") " +
                "AND (:rolesCsv IS NULL OR :rolesCsv = '' OR u.id_rol = ANY(string_to_array(:rolesCsv, ',')::int[])) " +
            "ORDER BY \"nombreCompleto\" ASC, u.id_usuario ASC " +
            "LIMIT :limit OFFSET :offset",
        nativeQuery = true)
    List<UsersView> searchUsuariosParaFrontend(
            @Param("term") String term,
            @Param("limit") int limit,
            @Param("offset") int offset,
            @Param("rolesCsv") String rolesCsv
    );

    /**
     * Cuenta el total de coincidencias para la búsqueda (necesario para la metadata de paginación).
     */
    @Query(value =
        "SELECT COUNT(*) FROM usuario u " +
                "WHERE u.id_usuario NOT IN (1, 2, 3, 4, 5, 6, 7) " +
                "AND u.activo = true " +
                "AND (" +
                "    CONCAT_WS(' ', " +
                "        NULLIF(TRIM(u.p_nombre), ''), " +
                "        NULLIF(TRIM(u.s_nombre), ''), " +
                "        NULLIF(TRIM(u.app_paterno), ''), " +
                "        NULLIF(TRIM(u.app_materno), '') " +
                "    ) ILIKE CONCAT('%', :term, '%') OR " +
                "    u.email ILIKE CONCAT('%', :term, '%') " +
                ") " +
                "AND (:rolesCsv IS NULL OR :rolesCsv = '' OR u.id_rol = ANY(string_to_array(:rolesCsv, ',')::int[]))",
        nativeQuery = true)
    long countSearchUsuariosParaFrontend(@Param("term") String term, @Param("rolesCsv") String rolesCsv);

    /**
     * Proyección ligera de estado de conexión: solo email + último acceso + activo.
     * Usada por el endpoint /online-status para refrescar la columna de estado sin re-paginar.
     */
    @Query(value =
        "SELECT u.email AS email, u.ultimo_acceso AS ultimoAcceso, u.activo AS activo " +
        "FROM usuario u " +
        "WHERE u.id_usuario NOT IN (1, 2, 3, 4, 5, 6, 7) " +
        "AND u.activo = true",
        nativeQuery = true)
    List<UserStatusView> findUsuariosStatus();

    Optional<Usuario> findUsuarioByEmailAndActivo(String email, Boolean activo);
    Optional<Usuario> findByEmailIgnoreCaseAndActivoTrue(String email);



    /**Validaciones booleanas*/
    boolean existsUsuarioByUsernameAndActivo(String username, Boolean activo);
    boolean existsUsuarioByEmailAndActivo(String email, Boolean activo);
    boolean existsByUsernameAndIdUsuarioNot(String username, Integer idUsuario);
    boolean existsByEmailAndIdUsuarioNot(String email, Integer idUsuario);


    @Query(value = "SELECT " +
            "concat_ws(' ', u.p_nombre, u.s_nombre, u.app_paterno, u.app_materno) AS nombreCompleto, " +
            "u.email AS email, " +
            "u.ultimo_acceso AS ultimoAcceso, " +
            "u.url_foto_perfil AS urlFotoPerfil, " +
            "r.nombre_rol AS nombreRol, " +
            "u.contrasena AS contrasena, " +
            "u.activo AS activo " +
            "FROM usuario u " +
            "JOIN rol r ON r.id_rol = u.id_rol " +
            "WHERE (u.username = :identificador OR u.email = :identificador) " +
            "AND u.activo = true", nativeQuery = true)
    Optional<UserAuthProjection> findUserAuth(@Param("identificador") String identificador);


    @Query(value = """
        SELECT 
            u.id_usuario AS idUsuario,
            CONCAT_WS(' ', 
                NULLIF(TRIM(u.p_nombre), ''), 
                NULLIF(TRIM(u.s_nombre), ''), 
                NULLIF(TRIM(u.app_paterno), ''), 
                NULLIF(TRIM(u.app_materno), '')
            ) AS nombreCompleto
        FROM usuario u
        WHERE u.id_rol IN (1, 2, 3, 4)
          AND u.id_usuario NOT IN (1, 2, 3, 4, 5, 6, 7) -- Excluye usuarios de sistema
        ORDER BY nombreCompleto ASC
        """, nativeQuery = true)
    List<UsersToManageCourseOrSectionView> usersToManageCourse();


    @Query(value = """
        SELECT 
            u.id_usuario AS idUsuario,
            CONCAT_WS(' ', 
                NULLIF(TRIM(u.p_nombre), ''), 
                NULLIF(TRIM(u.s_nombre), ''), 
                NULLIF(TRIM(u.app_paterno), ''), 
                NULLIF(TRIM(u.app_materno), '')
            ) AS nombreCompleto
        FROM usuario u
        WHERE u.id_rol IN (4,5)
          AND u.id_usuario NOT IN (1, 2, 3, 4, 5, 6, 7) -- Excluye usuarios de sistema
        ORDER BY nombreCompleto ASC
        """, nativeQuery = true)
    List<UsersToManageCourseOrSectionView> usersAssignedToSection();










    /**
     * Busca un usuario por email
     */
    Optional<Usuario> findByEmail(String email);

    /**
     * Busca un usuario por email ignorando mayúsculas/minúsculas
     */
    Optional<Usuario> findByEmailIgnoreCase(String email);

    Optional<UserIdNameView> findViewByEmail(String email);



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