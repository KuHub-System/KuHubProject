package KuHub.modules.gestion_solicitud.dtos;

import lombok.*;

@Getter@Setter@ToString@AllArgsConstructor@NoArgsConstructor
public class ManagementFilterRequestDTO {
    private Integer idDocente;
    private Integer idSemana;
    private Integer idAsignatura;
    private String estadoSolicitud;
}
