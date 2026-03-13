package KuHub.modules.gestion_solicitud.dtos.respose;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ReservedScheduleDTO {
    @JsonProperty("numeroBloque")
    private Integer numeroBloque;

    @JsonProperty("horaInicio")
    private String horaInicio;

    @JsonProperty("horaFin")
    private String horaFin;

    @JsonProperty("nombreSala")
    private String nombreSala;
}
