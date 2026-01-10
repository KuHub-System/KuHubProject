package KuHub.modules.gestion_solicitud.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CheckSectionAvailabilityRequestDTO {
    private Integer idSemana;
    private List<Integer> idsSecciones;
}
