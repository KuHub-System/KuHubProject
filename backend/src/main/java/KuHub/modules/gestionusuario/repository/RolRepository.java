package KuHub.modules.gestionusuario.repository;

import KuHub.modules.gestionusuario.entity.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

/**
 * Repository para la entidad Rol
 */
@Repository
public interface RolRepository extends JpaRepository<Rol, Integer> {

    /**
     * Busca un rol por su nombre
     */
    Optional<Rol> findByNombreRol(String nombreRol);

    /**
     * Busca un rol por su nombre ignorando mayúsculas/minúsculas
     */
    Optional<Rol> findByNombreRolIgnoreCase(String nombreRol);

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