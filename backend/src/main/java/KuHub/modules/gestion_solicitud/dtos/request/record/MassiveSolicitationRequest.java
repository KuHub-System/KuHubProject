package KuHub.modules.gestion_solicitud.dtos.request.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO Maestro para la creación masiva de solicitudes.
 * ES un record (igual que DashboardConsolidadoResponse).
 * Los records anidados son estáticos implícitamente en Java.
 */
public record MassiveSolicitationRequest(
        @NotNull(message = "El idAsignatura es obligatorio")
        Integer idAsignatura,

        @NotNull(message = "El idSemana es obligatorio")
        Integer idSemana,

        Integer idReceta,

        @Size(max = 600, message = "La observación no puede superar los 600 caracteres")
        String observacion,

        @Valid
        @NotEmpty(message = "Debe enviar al menos una sección")
        List<SectionCreateSolicitationDTO> secciones,

        @Valid
        DeltasSolicitationDTO deltas
) {

    // ============================================================================
    // 1. SECCIONES
    // ============================================================================

    public record SectionCreateSolicitationDTO(
            @NotNull(message = "El idSeccion es obligatorio")
            Integer idSeccion,

            @NotNull(message = "El idUsuario docente es obligatorio")
            Integer idUsuario,

            @NotNull(message = "La cantidad de inscritos es obligatoria")
            Integer cantInscritos,

            @Valid
            @NotEmpty(message = "Debe incluir al menos un horario")
            List<ScheduleSolicitationDTO> horarios
    ) {}

    // ============================================================================
    // 2. HORARIOS
    // ============================================================================

    public record ScheduleSolicitationDTO(
            @NotNull(message = "El idReservaSala es obligatorio")
            Integer idReservaSala,

            @NotNull(message = "La fecha solicitada calculada es obligatoria")
            LocalDate fechaSolicitadaCalculada
    ) {}

    // ============================================================================
    // 3. DELTAS
    // ============================================================================

    public record DeltasSolicitationDTO(
            List<Integer> eliminados,

            @Valid
            List<ModifiedDetailSolicitationDTO> modificados,

            @Valid
            List<NewProductSolicitationDTO> nuevos
    ) {}

    // ============================================================================
    // 4. PRODUCTO MODIFICADO
    // ============================================================================

    public record ModifiedDetailSolicitationDTO(
            @NotNull(message = "El idDetalleReceta es obligatorio para modificar")
            Integer idDetalleReceta,

            @NotNull(message = "La cantidad del producto a modificar es obligatoria")
            BigDecimal cantProducto
    ) {}

    // ============================================================================
    // 5. PRODUCTO NUEVO
    // ============================================================================

    public record NewProductSolicitationDTO(
            @NotNull(message = "El idProducto es obligatorio para productos nuevos")
            Integer idProducto,

            @NotNull(message = "La cantidad del nuevo producto es obligatoria")
            BigDecimal cantProducto
    ) {}
}
