package KuHub.modules.gestion_solicitud.dtos.respose.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO Maestro para la respuesta de asignaturas con secciones y bloques activos.
 *
 * Reemplaza los archivos individuales:
 *   - CourseForSolicitationDTO
 *   - SectionForSolicitationDTO
 *   - BloquesForSolicitationDTO
 */
public record CourseForSolicitationResponse(
        Integer idAsignatura,
        String nombreAsignatura,
        List<SectionDTO> secciones
) {

    // ============================================================================
    // 1. SECCIONES — parseado desde row[2] (JSON)
    //    SQL genera: 'id_seccion', 'nombre_seccion', 'id_usuario',
    //                'nombre_docente', 'cant_inscritos', 'capacidad_max',
    //                'horarios', 'solicitudes' (snake_case)
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SectionDTO(
            @JsonProperty("id_seccion") Integer idSeccion,
            @JsonProperty("nombre_seccion") String nombreSeccion,
            @JsonProperty("id_usuario") Integer idUsuario,
            @JsonProperty("nombre_docente") String nombreDocente,
            @JsonProperty("cant_inscritos") Integer cantInscritos,
            @JsonProperty("capacidad_max") Integer capacidadMax,
            @JsonProperty("horarios") List<BloqueDTO> horarios,
            @JsonProperty("solicitudes") List<LocalDate> solicitudes
    ) {}

    // ============================================================================
    // 2. BLOQUES — anidado dentro de SectionDTO
    //    SQL genera: 'idReservaSala', 'numeroBloque', 'horaInicio', 'horaFin',
    //                'diaSemana', 'idSala', 'codSala', 'nombreSala' (camelCase)
    // ============================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BloqueDTO(
            @JsonProperty("idReservaSala") Integer idReservaSala,
            @JsonProperty("numeroBloque") Integer numeroBloque,
            @JsonProperty("horaInicio") String horaInicio,
            @JsonProperty("horaFin") String horaFin,
            @JsonProperty("diaSemana") String diaSemana,
            @JsonProperty("idSala") Integer idSala,
            @JsonProperty("codSala") String codSala,
            @JsonProperty("nombreSala") String nombreSala
    ) {}
}
