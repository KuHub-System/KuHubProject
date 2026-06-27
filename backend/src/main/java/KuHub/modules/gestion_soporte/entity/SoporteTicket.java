package KuHub.modules.gestion_soporte.entity;

import KuHub.modules.gestion_usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "soporte_ticket")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SoporteTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_soporte")
    private Integer idSoporte;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_equipo", columnDefinition = "tipo_equipo_soporte_type", nullable = false)
    private TipoEquipoSoporte tipoEquipo;

    @Column(name = "equipo_otro", length = 100)
    private String equipoOtro;

    @Column(name = "sistema_operativo", length = 50, nullable = false)
    private String sistemaOperativo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_error", columnDefinition = "tipo_error_soporte_type", nullable = false)
    private TipoErrorSoporte tipoError;

    @Column(name = "descripcion", columnDefinition = "TEXT", nullable = false)
    private String descripcion;

    @Column(name = "url_origen", length = 255)
    private String urlOrigen;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", columnDefinition = "estado_soporte_type", nullable = false)
    private EstadoSoporte estado = EstadoSoporte.ABIERTO;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    // ----------- Métodos Helper para asignación por ID -----------

    public void setIdUsuario(Integer id) {
        if (id != null) {
            this.usuario = new Usuario();
            this.usuario.setIdUsuario(id);
        }
    }
}
