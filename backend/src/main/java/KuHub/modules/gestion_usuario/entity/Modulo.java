package KuHub.modules.gestion_usuario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entidad que representa un MÓDULO (página/funcionalidad) del sistema.
 * Mapea la tabla 'modulo' en PostgreSQL.
 * Cada módulo corresponde a una página o sección del frontend.
 */
@Entity
@Table(name = "modulo", schema = "public")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Modulo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_modulo")
    private Integer idModulo;

    @Column(name = "codigo_modulo", nullable = false, unique = true, length = 50)
    private String codigoModulo;

    @Column(name = "nombre_modulo", nullable = false, length = 100)
    private String nombreModulo;

    @Column(name = "descripcion_modulo", columnDefinition = "TEXT")
    private String descripcionModulo;

    @Column(name = "icono_modulo", length = 100)
    private String iconoModulo;

    @Column(name = "orden_modulo")
    private Integer ordenModulo = 0;

    @CreationTimestamp
    @Column(name = "fecha_creacion_modulo", nullable = false, updatable = false)
    private LocalDateTime fechaCreacionModulo;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion_modulo", nullable = false)
    private LocalDateTime fechaActualizacionModulo;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;
}
