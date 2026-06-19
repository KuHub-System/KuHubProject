package KuHub.modules.asistente_ia.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

/**
 * Petición de chat al asistente IA.
 * Contiene el historial completo de la conversación; el último mensaje debe ser del usuario.
 * El backend antepone el system prompt de KuHub antes de enviarlo a Ollama.
 */
@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
public class IaChatRequestDTO {

    @NotEmpty(message = "La conversación debe contener al menos un mensaje")
    @Size(max = 30, message = "La conversación no puede exceder los 30 mensajes")
    @Valid
    private List<MensajeDTO> mensajes;

    /**
     * Modelo de Ollama a utilizar (opcional). Si no se envía o no pertenece a la whitelist
     * configurada en {@code kuhub.ia.allowed-models}, el backend usa el modelo principal.
     */
    @Size(max = 60, message = "El nombre del modelo es demasiado largo")
    private String modelo;
}
