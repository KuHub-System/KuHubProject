package KuHub.modules.gestion_usuario.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Entidad que representa un USUARIO en el sistema
 * Mapea la tabla 'usuario' en PostgreSQL
 */
@Entity
@Table(name = "usuario", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_rol", nullable = false)
    private Rol rol;

    @Column(name = "p_nombre", length = 100)
    private String primerNombre;

    @Column(name = "s_nombre", length = 100)
    private String segundoNombre;

    @Column(name = "app_paterno", length = 100)
    private String apellidoPaterno;

    @Column(name = "app_materno", length = 100)
    private String apellidoMaterno;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "username", unique = true, length = 100)
    private String username;

    @Column(name = "contrasena", nullable = false, length = 255)
    private String contrasena;

    @Column(name = "foto_perfil")
    private byte[] fotoPerfil;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime fechaCreacion;

    @Column(name = "ultimo_acceso")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime ultimoAcceso;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
        if (activo == null) {
            activo = true;
        }
    }

    /**
     * Método helper para obtener el nombre completo del usuario
     */
    public String getNombreCompleto() {
        StringBuilder nombre = new StringBuilder();
        if (primerNombre != null) nombre.append(primerNombre).append(" ");
        if (segundoNombre != null) nombre.append(segundoNombre).append(" ");
        if (apellidoPaterno != null) nombre.append(apellidoPaterno).append(" ");
        if (apellidoMaterno != null) nombre.append(apellidoMaterno);
        return nombre.toString().trim();
    }
}