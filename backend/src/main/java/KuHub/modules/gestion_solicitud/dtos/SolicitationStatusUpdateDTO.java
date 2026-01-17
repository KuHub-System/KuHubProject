package KuHub.modules.gestion_solicitud.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SolicitationStatusUpdateDTO {
    @NotNull(message = "El ID de la solicitud es obligatorio")
    private Integer idSolicitud;

    @NotNull(message = "El estado es obligatorio")
    private String estado; // "ACEPTADA" o "RECHAZADA"

    // Opcional: Solo obligatorio si el estado es RECHAZADA
    private String motivoRechazo;
}
