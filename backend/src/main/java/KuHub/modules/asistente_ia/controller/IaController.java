package KuHub.modules.asistente_ia.controller;

import KuHub.modules.asistente_ia.dtos.request.IaChatRequestDTO;
import KuHub.modules.asistente_ia.dtos.response.IaChatResponseDTO;
import KuHub.modules.asistente_ia.exception.AsistenteIaException;
import KuHub.modules.asistente_ia.service.IaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller REST del asistente IA (Ollama + Qwen/DeepSeek).
 * Endpoints: /api/v1/ia
 *
 * <p>Único punto de entrada del frontend hacia la IA. El navegador nunca habla directo
 * con Ollama; este controller valida el JWT (vía SpringSecurityConfig) y delega en IaService,
 * que reenvía a la instancia de IA por la VPC privada.</p>
 *
 * ✅ En uso: Consumido por ia-service.ts (modal de chat en el header del frontend).
 */
@RestController
@RequestMapping("/api/v1/ia")
@Validated
public class IaController {

    @Autowired
    private IaService iaService;

    /**
     * Recibe el historial de conversación y devuelve la respuesta del asistente.
     * Maneja errores de disponibilidad/timeout de la IA devolviendo el status correspondiente.
     * ✅ En uso: Consumido por enviarMensajeIaService en ia-service.ts.
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chat(@Valid @RequestBody IaChatRequestDTO request) {
        try {
            IaChatResponseDTO respuesta = iaService.chat(request);
            return ResponseEntity.status(200).body(respuesta);
        } catch (AsistenteIaException ex) {
            return ResponseEntity.status(ex.getStatus()).body(Map.of("mensaje", ex.getMessage()));
        }
    }
}
