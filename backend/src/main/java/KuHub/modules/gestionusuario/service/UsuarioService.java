package KuHub.modules.gestionusuario.service;

import KuHub.modules.gestionusuario.dtos.*;
import KuHub.modules.gestionusuario.entity.Usuario;
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
     * Obtiene nombre completo del usuario
     */
    String obtenerNombreCompleto(UsuarioResponseDTO dto);

    /**
     * Formatea el nombre completo del usuario
     * */
    String formatearNombreCompleto(Usuario u);

    /**
     * Obtiene docentes ACTIVOS por el nombre de rol
     */
    List<UserIdAndCompleteNameDTO> obtenerDocentesYProfesoresActivos();

    /**
     * Obtiene todos los profesores a cargo
     * */
    List<UserIdAndCompleteNameDTO> obtenerTodosProfesorACargo();
    /**
     * Obtiene un usuario por su ID
     */
    UsuarioResponseDTO obtenerPorId(Integer idUsuario);

    /**
     * Obtiene un usuario por su ID a la forma de entidade
     */
    Usuario obtenerPorIdEntidad(Integer idUsuario);

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

    Boolean existeUsuarioActivo (Integer id);

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

    /**
     * Convierte un usuario en un DTO ahora publico
     */
    UsuarioResponseDTO convertirADTO(Usuario usuario);
}