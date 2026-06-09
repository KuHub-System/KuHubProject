package KuHub.modules.asistente_ia.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Opciones de inferencia para Ollama. Los nombres en el JSON son snake_case
 * (num_ctx, num_predict) según la API de Ollama.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OllamaOptions(
        @JsonProperty("num_ctx") Integer numCtx,
        @JsonProperty("num_predict") Integer numPredict
) {
}
