package KuHub.modules.gestion_usuario.service;

import KuHub.modules.gestion_usuario.dtos.PermisoMatrizDTO;
import KuHub.modules.gestion_usuario.dtos.PermisoRolRequestDTO;
import KuHub.modules.gestion_usuario.dtos.PermisoRolResponseDTO;

import java.util.List;
import java.util.Map;

/**
 * Servicio para gestión de permisos por rol.
 */
public interface PermisoRolService {

    /**
     * Devuelve la matriz completa de permisos agrupada por código de módulo.
     * Key = codigoModulo, Value = lista de permisos de cada rol para ese módulo.
     */
    Map<String, List<PermisoMatrizDTO>> getPermissionMatrix();

    /**
     * Devuelve los permisos de un rol específico (todos sus módulos).
     */
    List<PermisoRolResponseDTO> getPermisosByRol(Integer idRol);

    /**
     * Crea un nuevo registro de permiso para un Rol × Módulo.
     */
    PermisoRolResponseDTO crearPermiso(PermisoRolRequestDTO request);

    /**
     * Actualiza un permiso existente (por su ID).
     */
    PermisoRolResponseDTO actualizarPermiso(Long idPermisoRol, PermisoRolRequestDTO request);

    /**
     * Crea o actualiza (upsert) el permiso para un Rol × Módulo dado.
     */
    PermisoRolResponseDTO upsertPermiso(PermisoRolRequestDTO request);
}
