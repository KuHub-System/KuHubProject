package KuHub.modules.gestion_usuario.repository;

import KuHub.modules.gestion_usuario.entity.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

/**
 * Repository para la entidad Rol
 */
@Repository
public interface RolRepository extends JpaRepository<Rol, Integer> {





    /**Validaciones booleanas*/
    boolean existsByIdRolAndActivo (Integer idRol, Boolean activo);










    /**
     * Busca un rol por su nombre
     */
    Optional<Rol> findByNombreRol(String nombreRol);

    /**
     * Busca un rol por su nombre ignorando mayúsculas/minúsculas (ENUM cast to text)
     */
    @Query(value = "SELECT r1_0.id_rol, r1_0.activo, r1_0.nombre_rol FROM public.rol r1_0 WHERE UPPER(r1_0.nombre_rol::text) = UPPER(:nombreRol)", nativeQuery = true)
    Optional<Rol> findByNombreRolIgnoreCase(@Param("nombreRol") String nombreRol);

    /**
     * Verifica si existe un rol con ese nombre
     */
    boolean existsByNombreRol(String nombreRol);

    /**
     * Obtiene todos los roles activos
     */
    List<Rol> findByActivoTrue();

    /**
     * Obtiene todos los roles ordenados por nombre
     */
    List<Rol> findAllByOrderByNombreRolAsc();
}