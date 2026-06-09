package KuHub.modules.asistente_ia.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Respuesta de POST {ollama}/api/chat con stream=false.
 * Se ignoran los campos no usados (created_at, done_reason, eval_count, etc.).
 *
 * @param model         modelo que respondió
 * @param message       mensaje del asistente (role=assistant, content=texto)
 * @param done          true cuando la generación terminó
 * @param totalDuration tiempo total de generación en nanosegundos
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OllamaChatResponse(
        String model,
        OllamaMessage message,
        Boolean done,
        @JsonProperty("total_duration") Long totalDuration
) {
}
