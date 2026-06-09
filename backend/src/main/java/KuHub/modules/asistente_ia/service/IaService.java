package KuHub.modules.asistente_ia.service;

import KuHub.modules.asistente_ia.dtos.request.IaChatRequestDTO;
import KuHub.modules.asistente_ia.dtos.response.IaChatResponseDTO;

/**
 * Servicio del asistente IA. Orquesta la conversación con el modelo local (Ollama)
 * corriendo en la instancia dedicada de IA.
 */
public interface IaService {

    /**
     * Envía el historial de conversación al modelo y devuelve la respuesta del asistente.
     *
     * @param request historial de mensajes (el último debe ser del usuario)
     * @return respuesta generada, modelo usado y duración aproximada
     */
    IaChatResponseDTO chat(IaChatRequestDTO request);
}
