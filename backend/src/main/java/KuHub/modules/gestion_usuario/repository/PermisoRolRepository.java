package KuHub.modules.gestion_usuario.repository;

import KuHub.modules.gestion_usuario.entity.PermisoRol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermisoRolRepository extends JpaRepository<PermisoRol, Long> {

    Optional<PermisoRol> findByRol_IdRolAndModulo_IdModulo(Integer idRol, Integer idModulo);

    List<PermisoRol> findByRol_IdRolAndEnabledTrue(Integer idRol);

    /**
     * Busca el permiso activo de un rol (por ID) sobre un módulo (por código).
     * Usado por DynamicPermissionService para evaluar permisos dinámicamente.
     */
    @Query("SELECT pr FROM PermisoRol pr WHERE pr.rol.idRol = :idRol AND pr.modulo.codigoModulo = :moduleCode AND pr.enabled = true")
    Optional<PermisoRol> findByRolIdAndModuleCode(@Param("idRol") Integer idRol,
                                                   @Param("moduleCode") String moduleCode);

    /**
     * Consulta nativa que devuelve la MATRIZ COMPLETA de permisos:
     * todos los roles activos × todos los módulos activos,
     * con LEFT JOIN para incluir combinaciones sin registro (sin acceso por defecto).
     */
    @Query(value = """
            SELECT
                r.id_rol          AS idRol,
                r.nombre_rol      AS nombreRol,
                m.id_modulo       AS idModulo,
                m.codigo_modulo   AS codigoModulo,
                m.nombre_modulo   AS nombreModulo,
                m.orden_modulo    AS ordenModulo,
                pr.id_permiso_rol AS idPermisoRol,
                COALESCE(pr.puede_leer,       false) AS puedeLeer,
                COALESCE(pr.puede_crear,      false) AS puedeCrear,
                COALESCE(pr.puede_actualizar, false) AS puedeActualizar,
                COALESCE(pr.puede_eliminar,   false) AS puedeEliminar
            FROM rol r
            CROSS JOIN modulo m
            LEFT JOIN permiso_rol pr
                ON pr.id_rol = r.id_rol
               AND pr.id_modulo = m.id_modulo
               AND pr.enabled = true
            WHERE r.activo = true
              AND m.enabled = true
            ORDER BY m.orden_modulo, r.id_rol
            """, nativeQuery = true)
    List<PermisoMatrizProjection> findPermissionMatrix();

    /**
     * Proyección de la consulta nativa para la matriz de permisos.
     */
    interface PermisoMatrizProjection {
        Integer getIdRol();
        String  getNombreRol();
        Integer getIdModulo();
        String  getCodigoModulo();
        String  getNombreModulo();
        Integer getOrdenModulo();
        Long    getIdPermisoRol();
        Boolean getPuedeLeer();
        Boolean getPuedeCrear();
        Boolean getPuedeActualizar();
        Boolean getPuedeEliminar();
    }
}
