package KuHub.modules.gestion_academica.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SectionBlockDTO {
    private Integer numeroBloque;
    private String horaInicio;
    private String horaFin;
    private String diaSemana;
    private Integer idSala;
    private String codSala;
    private String nombreSala;
}
