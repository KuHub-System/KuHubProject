package KuHub.modules.gestion_usuario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entidad que almacena los Refresh Tokens de sesiones "Recordar sesión".
 * Cada fila vincula un token de larga duración a un usuario.
 * Al hacer logout o cambiar contraseña, el token se revoca (activo=false).
 *
 * CREATE TABLE refresh_token (
 *   id_refresh_token BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 *   id_usuario       INTEGER NOT NULL REFERENCES usuario(id_usuario),
 *   token            VARCHAR(255) NOT NULL UNIQUE,
 *   expires_at       TIMESTAMP NOT NULL,
 *   activo           BOOLEAN NOT NULL DEFAULT TRUE,
 *   creado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
 * );
 */
@Entity
@Table(name = "refresh_token", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_refresh_token")
    private Long idRefreshToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "token", nullable = false, unique = true, length = 255)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        if (creadoEn == null) {
            creadoEn = LocalDateTime.now();
        }
        if (activo == null) {
            activo = true;
        }
    }
}
