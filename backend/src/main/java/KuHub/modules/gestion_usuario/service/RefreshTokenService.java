package KuHub.modules.gestion_usuario.service;

import KuHub.modules.gestion_usuario.entity.RefreshToken;
import KuHub.modules.gestion_usuario.entity.Usuario;

public interface RefreshTokenService {

    /** Crea y persiste un nuevo Refresh Token de 30 días para el usuario. */
    RefreshToken crearRefreshToken(Usuario usuario);

    /**
     * Valida que el token exista, esté activo y no haya expirado.
     * Lanza GestionUsuarioException si no es válido.
     */
    RefreshToken validar(String token);

    /** Revoca todos los refresh tokens activos del usuario (logout, cambio de clave). */
    void revocarTodosPorUsuario(Integer idUsuario);
}
