package KuHub.modules.gestion_usuario.service;

import KuHub.modules.gestion_usuario.entity.RefreshToken;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.exceptions.GestionUsuarioException;
import KuHub.modules.gestion_usuario.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    /**Repositories*/
    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    private static final long DURACION_DIAS = 30L;

    @Override
    @Transactional
    public RefreshToken crearRefreshToken(Usuario usuario) {
        // Revocar tokens anteriores del usuario antes de crear uno nuevo
        refreshTokenRepository.revocarTodosPorUsuario(usuario.getIdUsuario());

        RefreshToken rt = new RefreshToken();
        rt.setUsuario(usuario);
        rt.setToken(UUID.randomUUID().toString());
        rt.setExpiresAt(LocalDateTime.now().plusDays(DURACION_DIAS));
        rt.setActivo(true);

        RefreshToken guardado = refreshTokenRepository.save(rt);
        log.info("Refresh token creado para usuario id={}", usuario.getIdUsuario());
        return guardado;
    }

    @Override
    @Transactional(readOnly = true)
    public RefreshToken validar(String token) {
        RefreshToken rt = refreshTokenRepository.findByTokenAndActivoTrue(token)
                .orElseThrow(() -> new GestionUsuarioException(
                        "Refresh token inválido o revocado", HttpStatus.UNAUTHORIZED));

        if (rt.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("Refresh token expirado para usuario id={}", rt.getUsuario().getIdUsuario());
            throw new GestionUsuarioException("Refresh token expirado", HttpStatus.UNAUTHORIZED);
        }

        return rt;
    }

    @Override
    @Transactional
    public void revocarTodosPorUsuario(Integer idUsuario) {
        int revocados = refreshTokenRepository.revocarTodosPorUsuario(idUsuario);
        log.info("Revocados {} refresh tokens para usuario id={}", revocados, idUsuario);
    }
}
