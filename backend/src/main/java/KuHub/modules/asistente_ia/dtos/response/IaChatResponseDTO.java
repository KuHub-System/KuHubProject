package KuHub.modules.asistente_ia.dtos.response;

/**
 * Respuesta del asistente IA hacia el frontend.
 *
 * @param respuesta   texto generado por la IA (ya sin el bloque de razonamiento de DeepSeek)
 * @param modelo      modelo que respondió (ej: qwen2.5:1.5b)
 * @param duracionMs  tiempo aproximado de generación en milisegundos
 */
public record IaChatResponseDTO(
        String respuesta,
        String modelo,
        Long duracionMs
) {
}
