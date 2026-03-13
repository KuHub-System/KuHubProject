package KuHub.modules.gestion_solicitud.entity;

import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.entity.Seccion;
import KuHub.modules.gestion_receta.entity.Receta;
import KuHub.modules.gestion_usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "solicitud")
@IdClass(SolicitudId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Solicitud {

    @Id // Parte 1 de la PK
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud")
    private Integer idSolicitud;

    @Id // Parte 2 de la PK (Clave de partición)
    @Column(name = "fecha_solicitada", nullable = false)
    private LocalDate fechaSolicitada;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_gestor_solicitud", nullable = false)
    private Usuario usuarioGestor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_seccion", nullable = false)
    private Seccion seccion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_receta", nullable = true) // Es nullable = true por defecto, pero es buena práctica declararlo
    private Receta receta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_reserva_sala", nullable = true)
    private ReservaSala reservaSala;

    @Column(name = "fecha_registro", insertable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @Column(length = 600)
    private String observaciones;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_solicitud", columnDefinition = "estado_solicitud_type")
    private EstadoSolicitud estadoSolicitud;

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<DetalleSolicitud> detalles = new ArrayList<>();

    // ----------- Métodos Helper para asignación por ID -----------

    public void setIdUsuarioGestorSolicitud(Integer id) {
        if (id != null) {
            this.usuarioGestor = new Usuario();
            this.usuarioGestor.setIdUsuario(id);
        }
    }

    public void setIdSeccion(Integer id) {
        if (id != null) {
            this.seccion = new Seccion();
            this.seccion.setIdSeccion(id);
        }
    }

    public void setIdReceta(Integer id) {
        if (id != null) {
            this.receta = new Receta();
            this.receta.setIdReceta(id);
        }
    }

    public void setIdReservaSala(Integer id) {
        if (id != null) {
            this.reservaSala = new ReservaSala();
            this.reservaSala.setIdReservaSala(id);
        }
    }

    public void addDetalle(DetalleSolicitud detalle) {
        detalles.add(detalle);
        detalle.setSolicitud(this);
    }

    public enum EstadoSolicitud {
        PENDIENTE,
        ACEPTADA,
        PROCESADO,
        RECHAZADA
    }
}

