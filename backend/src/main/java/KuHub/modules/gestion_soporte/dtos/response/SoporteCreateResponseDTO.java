package KuHub.modules.gestion_soporte.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class SoporteCreateResponseDTO {
    private Integer idSoporte;
    private String estado;
}
