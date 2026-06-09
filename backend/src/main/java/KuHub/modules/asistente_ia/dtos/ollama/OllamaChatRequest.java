package KuHub.modules.asistente_ia.dtos.ollama;

import java.util.List;

/**
 * Cuerpo de la petición a POST {ollama}/api/chat.
 * stream=false para recibir la respuesta completa en una sola llamada.
 */
public record OllamaChatRequest(
        String model,
        List<OllamaMessage> messages,
        boolean stream,
        OllamaOptions options
) {
}
