package KuHub.modules.gestionusuario.service;

import KuHub.modules.gestionusuario.dtos.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Interfaz del servicio para gestión de Usuarios
 */
public interface UsuarioService {

    /**
     * Obtiene todos los usuarios
     */
    List<UsuarioResponseDTO> obtenerTodos();

    /**
     * Obtiene solo los usuarios activos
     */
    List<UsuarioResponseDTO> obtenerActivos();

    /**
     * Obtiene un usuario por su ID
     */
    UsuarioResponseDTO obtenerPorId(Integer idUsuario);

    /**
     * Obtiene un usuario por su email
     */
    UsuarioResponseDTO obtenerPorEmail(String email);

    /**
     * Busca usuarios por nombre o email
     */
    List<UsuarioResponseDTO> buscar(String busqueda);

    /**
     * Obtiene usuarios por rol
     */
    List<UsuarioResponseDTO> obtenerPorRol(Integer idRol);

    /**
     * Crea un nuevo usuario
     */
    UsuarioResponseDTO crear(UsuarioRequestDTO usuarioRequestDTO);

    /**
     * Actualiza un usuario existente
     */
    UsuarioResponseDTO actualizar(Integer idUsuario, UsuarioUpdateDTO usuarioUpdateDTO);

    /**
     * Desactiva un usuario (soft delete)
     */
    void desactivar(Integer idUsuario);

    /**
     * Activa un usuario
     */
    void activar(Integer idUsuario);

    /**
     * Elimina un usuario (hard delete)
     */
    void eliminar(Integer idUsuario);

    /**
     * Cambia la contraseña de un usuario
     */
    void cambiarContrasena(Integer idUsuario, String nuevaContrasena);

    /**
     * Actualiza la foto de perfil
     */
    UsuarioResponseDTO actualizarFotoPerfil(Integer idUsuario, MultipartFile foto);

    /**
     * Verifica credenciales y realiza login
     */
    LoginResponseDTO login(LoginRequestDTO loginRequestDTO);

    /**
     * Actualiza el último acceso del usuario
     */
    void actualizarUltimoAcceso(Integer idUsuario);

    /**
     * Obtiene estadísticas de usuarios
     */
    UsuarioEstadisticasDTO obtenerEstadisticas();
}