package KuHub.modules.gestion_solicitud.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BloquesForSolicitationDTO {
    @JsonProperty("idReservaSala")
    private Integer idReservaSala;

    @JsonProperty("numeroBloque")
    private Integer numeroBloque;

    @JsonProperty("horaInicio")
    private String horaInicio;

    @JsonProperty("horaFin")
    private String horaFin;

    @JsonProperty("diaSemana")
    private String diaSemana;

    @JsonProperty("idSala")
    private Integer idSala;

    @JsonProperty("codSala")
    private String codSala;

    @JsonProperty("nombreSala")
    private String nombreSala;
}
