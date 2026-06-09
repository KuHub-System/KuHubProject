package KuHub.modules.asistente_ia.dtos.ollama;

/**
 * Mensaje en el formato que espera/devuelve la API /api/chat de Ollama.
 * role: "system" | "user" | "assistant".
 */
public record OllamaMessage(String role, String content) {
}
