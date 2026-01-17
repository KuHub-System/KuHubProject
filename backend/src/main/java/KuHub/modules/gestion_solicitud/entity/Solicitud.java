package KuHub.modules.gestion_solicitud.entity;

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
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idSolicitud;

    @Column(name = "id_usuario_gestor_solicitud", nullable = false)
    private Integer idUsuarioGestorSolicitud;

    @Column(name = "id_seccion", nullable = false)
    private Integer idSeccion;

    @Column(name = "fecha_solicitada", nullable = false)
    private LocalDate fechaSolicitada;

    @Column(name = "fecha_registro", insertable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @Column(length = 600)
    private String observaciones;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_solicitud", columnDefinition = "estado_solicitud_type")
    private EstadoSolicitud estadoSolicitud;

    // --- RELACIÓN PADRE-HIJO
    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<DetalleSolicitud> detalles = new ArrayList<>();

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

