package KuHub.modules.gestion_solicitud.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "motivo_rechazo_solicitud")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MotivoRechazoSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_motivo")
    private Integer idMotivo;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "id_solicitud", referencedColumnName = "id_solicitud", nullable = false),
            @JoinColumn(name = "fecha_solicitada", referencedColumnName = "fecha_solicitada", nullable = false)
    })
    private Solicitud solicitud;

    @Column(name = "motivo", nullable = false, length = 200)
    private String motivo;

    @Column(name = "fecha_rechazo")
    @Builder.Default
    private LocalDateTime fechaRechazo = LocalDateTime.now();

    // ----------- Métodos Helper para asignación por ID -----------

    public void setIdSolicitudRechazada(Integer id, LocalDate fecha) {
        if (id != null && fecha != null) {
            this.solicitud = new Solicitud();
            this.solicitud.setIdSolicitud(id);
            this.solicitud.setFechaSolicitada(fecha);
        }
    }
}
