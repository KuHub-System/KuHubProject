package KuHub.modules.gestion_solicitud.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SectionForSolicitationDTO {

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
    private List<BloquesForSolicitationDTO> horarios;
}
