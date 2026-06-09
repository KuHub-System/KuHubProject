package KuHub.modules.asistente_ia.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Un mensaje individual dentro de la conversación con el asistente IA.
 * El rol indica quién lo emitió: "user" (usuario) o "assistant" (la IA).
 */
@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
public class MensajeDTO {

    @NotBlank(message = "El rol del mensaje es obligatorio (user o assistant)")
    private String rol;

    @NotBlank(message = "El contenido del mensaje no puede estar vacío")
    @Size(max = 4000, message = "El mensaje no puede exceder los 4000 caracteres")
    private String contenido;
}
