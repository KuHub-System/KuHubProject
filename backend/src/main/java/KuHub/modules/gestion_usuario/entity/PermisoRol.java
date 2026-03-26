package KuHub.modules.gestion_usuario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entidad que representa los PERMISOS de un ROL sobre un MÓDULO.
 * Tabla junction: rol × módulo con flags CRUD (leer, crear, actualizar, eliminar).
 * Mapea la tabla 'permiso_rol' en PostgreSQL.
 */
@Entity
@Table(name = "permiso_rol", schema = "public",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_permiso_rol_modulo", columnNames = {"id_rol", "id_modulo"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PermisoRol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_permiso_rol")
    private Long idPermisoRol;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rol", nullable = false, foreignKey = @ForeignKey(name = "fk_permiso_rol_rol"))
    private Rol rol;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_modulo", nullable = false, foreignKey = @ForeignKey(name = "fk_permiso_rol_modulo"))
    private Modulo modulo;

    @Column(name = "puede_leer", nullable = false)
    private Boolean puedeLeer = false;

    @Column(name = "puede_crear", nullable = false)
    private Boolean puedeCrear = false;

    @Column(name = "puede_actualizar", nullable = false)
    private Boolean puedeActualizar = false;

    @Column(name = "puede_eliminar", nullable = false)
    private Boolean puedeEliminar = false;

    @CreationTimestamp
    @Column(name = "fecha_creacion_permiso_rol", nullable = false, updatable = false)
    private LocalDateTime fechaCreacionPermisoRol;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion_permiso_rol", nullable = false)
    private LocalDateTime fechaActualizacionPermisoRol;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;
}
