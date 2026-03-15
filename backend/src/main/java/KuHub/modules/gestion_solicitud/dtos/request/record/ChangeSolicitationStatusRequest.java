package KuHub.modules.gestion_solicitud.dtos.request.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * DTO Maestro para el cambio masivo de estado de solicitudes.
 *
 * Reemplaza los archivos individuales:
 *   - ChangeSolicitationStatusDTO
 *   - SolicitationStatusItemDTO
 */
public record ChangeSolicitationStatusRequest(
        @Valid
        @NotEmpty(message = "La lista de solicitudes no puede estar vacía")
        List<StatusItemDTO> estadosSolicitudes
) {

    // ============================================================================
    // 1. ITEM DE ESTADO — cada solicitud con su nuevo estado
    // ============================================================================

    public record StatusItemDTO(
            @NotNull(message = "El idSolicitud es obligatorio")
            Integer idSolicitud,

            @NotBlank(message = "El estado es obligatorio")
            String estado
    ) {}
}

