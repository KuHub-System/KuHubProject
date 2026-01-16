package KuHub.modules.gestion_solicitud.dtos;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ManagementSolicitationRequestDTO {
    // Si viene null, la query traerá todos los docentes
    private Integer idUsuarioDocente;

    // Si viene null, la query traerá todas las semanas
    private Integer idSemana;

    // Si viene null, la query traerá todas las asignaturas
    private Integer idAsignatura;

    private String estadoSolicitud;
}
