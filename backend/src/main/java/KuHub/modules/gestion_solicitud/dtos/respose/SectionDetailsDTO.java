package KuHub.modules.gestion_solicitud.dtos.respose;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class SectionDetailsDTO {
    @JsonProperty("id_seccion")
    private Integer idSeccion;

    @JsonProperty("nombre_seccion")
    private String nombreSeccion;

    @JsonProperty("id_usuario")
    private Integer idUsuario;

    @JsonProperty("nombre_docente")
    private String nombreDocente;

    @JsonProperty("cant_inscritos")
    private Integer cantInscritos;

    @JsonProperty("capacidad_max")
    private Integer capacidadMax;

    @JsonProperty("horarios")
    private List<ReservedScheduleDTO> horarios;
}
