package KuHub.modules.gestion_solicitud.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @Column(name = "id_solicitud", nullable = false, unique = true)
    private Integer idSolicitud; // Usamos el ID directo para facilitar la inserción

    @Column(name = "motivo", nullable = false, length = 200)
    private String motivo;

    @Column(name = "fecha_rechazo")
    @Builder.Default
    private LocalDateTime fechaRechazo = LocalDateTime.now();
}
