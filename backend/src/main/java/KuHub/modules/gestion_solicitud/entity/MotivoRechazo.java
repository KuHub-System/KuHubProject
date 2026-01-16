package KuHub.modules.gestion_solicitud.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "motivo_rechazo_solicitud")
@Getter
@Setter
@NoArgsConstructor
public class MotivoRechazo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idMotivo;

    @Column(nullable = false)
    private String motivo;

    @Column(name = "fecha_rechazo")
    private LocalDateTime fechaRechazo = LocalDateTime.now();

    @Column(name = "id_solicitud", nullable = false)
    private Integer idSolicitud;

    public MotivoRechazo(Integer idSolicitud, String motivo) {
        this.idSolicitud = idSolicitud;
        this.motivo = motivo;
    }
}
