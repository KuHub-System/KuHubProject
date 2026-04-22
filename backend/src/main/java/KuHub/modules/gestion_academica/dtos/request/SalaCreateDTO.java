package KuHub.modules.gestion_academica.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
public class SalaCreateDTO {

    @NotBlank(message = "El código de sala es obligatorio")
    @Size(max = 50, message = "El código no puede superar los 50 caracteres")
    private String codSala;

    @NotBlank(message = "El nombre de sala es obligatorio")
    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
    private String nombreSala;
}
