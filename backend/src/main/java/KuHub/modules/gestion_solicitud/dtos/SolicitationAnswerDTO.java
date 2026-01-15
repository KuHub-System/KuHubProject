package KuHub.modules.gestion_solicitud.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SolicitationAnswerDTO {

    private Integer idSolicitud;
    private Integer idUsuarioGestorSolicitud;
    private Integer idSeccion;
    private LocalDate fechaSolicitada;
    private String estadoSolicitud; // Aquí guardamos el .name() del Enum
    private String observaciones;
    private List<DetalleAnswerDTO> detalles;
}
