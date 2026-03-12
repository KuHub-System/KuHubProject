package KuHub.modules.gestion_solicitud.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudId {
    private Integer idSolicitud;
    private LocalDate fechaSolicitada;
}
