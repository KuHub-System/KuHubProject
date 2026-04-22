package KuHub.modules.gestion_usuario.repository;

import KuHub.modules.gestion_usuario.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /** Busca un refresh token activo por su valor. */
    Optional<RefreshToken> findByTokenAndActivoTrue(String token);

    /** Revoca todos los refresh tokens activos de un usuario. */
    @Modifying
    @Transactional
    @Query("UPDATE RefreshToken rt SET rt.activo = false WHERE rt.usuario.idUsuario = :idUsuario AND rt.activo = true")
    int revocarTodosPorUsuario(@Param("idUsuario") Integer idUsuario);

    /** Elimina físicamente los tokens expirados (limpieza periódica). */
    @Modifying
    @Transactional
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :ahora")
    int eliminarExpirados(@Param("ahora") LocalDateTime ahora);
}
