package KuHub.modules.gestionusuario.dtos;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter@Setter@NoArgsConstructor
@AllArgsConstructor@ToString
public class UserIdAndCompleteNameDTO {
    @NotNull
    private Integer idProfODocente;
    @NotEmpty
    private String nombreCompleto;
}
