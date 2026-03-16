package KuHub.modules.gestion_solicitud.dtos.request.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Record utilizado para transportar datos maestros de filtros.
 *
 * Se utiliza para traer todas las unidades de medida y categorías
 * que serán usadas como opciones de filtro en los módulos de
 * inventario y bodega de tránsito.
 *
 * Su objetivo es centralizar estos datos para que el frontend
 * pueda cargar los filtros disponibles en una sola respuesta.
 */
public record ChangeSolicitationStatus(
        @Valid
        @NotEmpty(message = "La lista de solicitudes no puede estar vacía")
        List<StatusItemDTO> estadosSolicitudes
) {
    public record StatusItemDTO(
            @NotNull(message = "El idSolicitud es obligatorio")
            Integer idSolicitud,

            @NotBlank(message = "El estado es obligatorio")
            String estado
    ) {}
}

