package KuHub.modules.gestion_usuario.service;

import KuHub.modules.gestion_usuario.dtos.RolRequestDTO;
import KuHub.modules.gestion_usuario.dtos.RolResponseDTO;
import KuHub.modules.gestion_usuario.entity.Rol;

import java.util.List;

/**
 * Interfaz del servicio para gestión de Roles
 */
public interface RolService {

    /**
     * Obtiene todos los roles
     */
    List<RolResponseDTO> obtenerTodos();

    /**
     * Obtiene solo los roles activos
     */
    List<RolResponseDTO> obtenerActivos();

    /**
     * Obtiene un rol por su ID
     */
    RolResponseDTO obtenerPorId(Integer idRol);


    Rol obtenerEntityPorId(Integer idRol);
    /**
     * Obtiene un rol por su nombre
     */
    RolResponseDTO obtenerPorNombre(String nombreRol);

    /**
     * Crea un nuevo rol
     */
    RolResponseDTO crear(RolRequestDTO rolRequestDTO);

    /**
     * Actualiza un rol existente
     */
    RolResponseDTO actualizar(Integer idRol, RolRequestDTO rolRequestDTO);

    /**
     * Desactiva un rol (soft delete)
     */
    void desactivar(Integer idRol);

    /**
     * Activa un rol
     */
    void activar(Integer idRol);

    /**
     * Elimina un rol (hard delete)
     */
    void eliminar(Integer idRol);

    /**
     * Verifica si existe un rol con ese nombre
     */
    boolean existePorNombre(String nombreRol);
}