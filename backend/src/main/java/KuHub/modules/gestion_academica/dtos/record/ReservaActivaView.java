package KuHub.modules.gestion_academica.dtos.record;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Vista de una reserva de sala activa.
 * Construida desde json_build_object en consulta nativa (ver ReservaSalaRepository).
 * Deserializada con ObjectMapper en ReservaSalaServiceImp.
 */
public record ReservaActivaView(
        @JsonProperty("nombreAsignatura") String nombreAsignatura,
        @JsonProperty("nombreSeccion")    String nombreSeccion,
        @JsonProperty("nombreSala")       String nombreSala,
        @JsonProperty("codSala")          String codSala,
        @JsonProperty("diaSemana")        String diaSemana,
        @JsonProperty("numeroBloque")     Integer numeroBloque,
        @JsonProperty("horaInicio")       String horaInicio,
        @JsonProperty("horaFin")          String horaFin
) {}
