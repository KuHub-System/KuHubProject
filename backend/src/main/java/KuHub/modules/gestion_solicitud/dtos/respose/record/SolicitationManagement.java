package KuHub.modules.gestion_solicitud.dtos.respose.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO Maestro para la respuesta de solicitudes por semana.
 * Contiene todas las estructuras anidadas necesarias para Jackson (JSON).
 *
 * Reemplaza los archivos individuales:
 *   - SolicitationManagementDTO
 *   - CourseDetailsDTO
 *   - SectionDetailsDTO
 *   - ReservedScheduleDTO
 *   - ProductDetailSolicitationDTO
 */
public record SolicitationManagement(
        LocalDate fechaSolicitada,
        String nombreReceta,
        Integer idSolicitud,
        Integer idReceta,
        Integer idReservaSala,
        String estadoSolicitud,
        String observaciones,
        List<ProductDetailDTO> productos,
        CourseDetailsDTO asignaturaDetalle
) {

    // ============================================================================
    // 1. DETALLE DE ASIGNATURA — parseado desde row[8] (JSON)
    //    SQL genera: 'id_asignatura', 'nombre_asignatura', 'seccion'
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CourseDetailsDTO(
            @JsonProperty("id_asignatura") Integer idAsignatura,
            @JsonProperty("nombre_asignatura") String nombreAsignatura,
            @JsonProperty("seccion") SectionDetailsDTO seccion
    ) {}

    // ============================================================================
    // 2. DETALLE DE SECCIÓN — anidado dentro de CourseDetailsDTO
    //    SQL genera: 'id_seccion', 'nombre_seccion', 'id_usuario',
    //                'nombre_docente', 'cant_inscritos', 'capacidad_max', 'horarios'
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SectionDetailsDTO(
            @JsonProperty("id_seccion") Integer idSeccion,
            @JsonProperty("nombre_seccion") String nombreSeccion,
            @JsonProperty("id_usuario") Integer idUsuario,
            @JsonProperty("nombre_docente") String nombreDocente,
            @JsonProperty("cant_inscritos") Integer cantInscritos,
            @JsonProperty("capacidad_max") Integer capacidadMax,
            @JsonProperty("horarios") List<ReservedScheduleDTO> horarios
    ) {}

    // ============================================================================
    // 3. HORARIOS RESERVADOS — anidado dentro de SectionDetailsDTO
    //    SQL genera: 'numeroBloque', 'horaInicio', 'horaFin', 'nombreSala' (camelCase)
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReservedScheduleDTO(
            @JsonProperty("numeroBloque") Integer numeroBloque,
            @JsonProperty("horaInicio") String horaInicio,
            @JsonProperty("horaFin") String horaFin,
            @JsonProperty("nombreSala") String nombreSala
    ) {}

    // ============================================================================
    // 4. PRODUCTOS SOLICITADOS — parseado desde row[7] (JSON)
    //    SQL genera: 'nombreProducto', 'cantidad', 'unidad'
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProductDetailDTO(
            @JsonProperty("nombreProducto") String nombreProducto,
            @JsonProperty("cantidad") BigDecimal cantidad,
            @JsonProperty("unidad") String unidad,
            @JsonProperty("observacion") String observacion // <--- ¡AQUÍ ESTÁ AGREGADA!
    ) {}
}

