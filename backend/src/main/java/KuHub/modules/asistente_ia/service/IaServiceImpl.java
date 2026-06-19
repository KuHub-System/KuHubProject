package KuHub.modules.asistente_ia.service;

import KuHub.modules.asistente_ia.dtos.ollama.OllamaChatRequest;
import KuHub.modules.asistente_ia.dtos.ollama.OllamaChatResponse;
import KuHub.modules.asistente_ia.dtos.ollama.OllamaMessage;
import KuHub.modules.asistente_ia.dtos.ollama.OllamaOptions;
import KuHub.modules.asistente_ia.dtos.request.IaChatRequestDTO;
import KuHub.modules.asistente_ia.dtos.request.MensajeDTO;
import KuHub.modules.asistente_ia.dtos.response.IaChatResponseDTO;
import KuHub.modules.asistente_ia.exception.AsistenteIaException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Implementación del asistente IA sobre Ollama.
 *
 * <p>Convierte el historial recibido del frontend al formato de Ollama, antepone el
 * system prompt de KuHub, invoca POST /api/chat (stream=false) y devuelve el texto
 * generado. Si el modelo de respaldo (deepseek-r1) incluye un bloque de razonamiento
 * &lt;think&gt;...&lt;/think&gt;, se elimina antes de devolverlo.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IaServiceImpl implements IaService {

    /** Elimina el bloque de razonamiento que genera deepseek-r1 (no aplica a qwen). */
    private static final Pattern THINK_BLOCK = Pattern.compile("(?s)<think>.*?</think>");

    /**Others*/
    @Autowired
    private RestClient ollamaRestClient;

    @Value("${kuhub.ia.model:qwen2.5:1.5b}")
    private String modelo;

    /** Modelos permitidos para selección desde el frontend (whitelist anti-inyección). */
    @Value("${kuhub.ia.allowed-models:qwen2.5:1.5b,llama3.2:1b,gemma2:2b}")
    private String allowedModelsRaw;

    /** Whitelist parseada en {@link #init()}. Cualquier modelo fuera de aquí se ignora. */
    private Set<String> allowedModels;

    @Value("${kuhub.ia.num-ctx:2048}")
    private Integer numCtx;

    @Value("${kuhub.ia.num-predict:512}")
    private Integer numPredict;

    @Value("${kuhub.ia.system-prompt:Eres el asistente virtual de KuHub, un sistema de gestión gastronómica de DuocUC. Responde SIEMPRE en español, de forma breve, clara y cordial. Si no sabes algo, dilo con honestidad y no inventes datos.}")
    private String systemPrompt;

    /** Parsea la whitelist de modelos y garantiza que el principal siempre esté incluido. */
    @PostConstruct
    void init() {
        allowedModels = Arrays.stream(allowedModelsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        allowedModels.add(modelo);
        log.info("Asistente IA → modelos permitidos: {} (principal: {})", allowedModels, modelo);
    }

    @Override
    public IaChatResponseDTO chat(IaChatRequestDTO request) {
        String modeloEfectivo = resolverModelo(request.getModelo());
        List<OllamaMessage> messages = construirMensajes(request.getMensajes());

        OllamaChatRequest ollamaRequest = new OllamaChatRequest(
                modeloEfectivo,
                messages,
                false,
                new OllamaOptions(numCtx, numPredict)
        );

        OllamaChatResponse respuesta = invocarOllama(ollamaRequest);

        if (respuesta == null || respuesta.message() == null || respuesta.message().content() == null) {
            log.error("Ollama devolvió una respuesta vacía o sin contenido. Modelo: {}", modeloEfectivo);
            throw new AsistenteIaException(
                    "El asistente no devolvió respuesta. Intenta nuevamente.",
                    HttpStatus.BAD_GATEWAY);
        }

        String texto = limpiarRazonamiento(respuesta.message().content());
        long duracionMs = respuesta.totalDuration() != null ? respuesta.totalDuration() / 1_000_000 : 0L;

        log.info("Respuesta IA generada. Modelo: {} | Duración: {} ms", modeloEfectivo, duracionMs);

        return new IaChatResponseDTO(texto, modeloEfectivo, duracionMs);
    }

    // ──────────────────────────── Métodos privados ────────────────────────────

    /**
     * Devuelve el modelo solicitado solo si pertenece a la whitelist; en cualquier otro caso
     * (null, vacío o no permitido) cae al modelo principal. Evita que el cliente fuerce
     * modelos arbitrarios (p. ej. uno de 7B que tumbaría la instancia de 2 GB).
     */
    private String resolverModelo(String solicitado) {
        if (solicitado != null && !solicitado.isBlank() && allowedModels.contains(solicitado.trim())) {
            return solicitado.trim();
        }
        if (solicitado != null && !solicitado.isBlank()) {
            log.warn("Modelo solicitado no permitido: '{}'. Usando principal: {}", solicitado, modelo);
        }
        return modelo;
    }

    /** Antepone el system prompt y mapea el historial del frontend al formato Ollama. */
    private List<OllamaMessage> construirMensajes(List<MensajeDTO> historial) {
        List<OllamaMessage> messages = new ArrayList<>();
        messages.add(new OllamaMessage("system", systemPrompt));
        for (MensajeDTO mensaje : historial) {
            String rol = "assistant".equalsIgnoreCase(mensaje.getRol()) ? "assistant" : "user";
            messages.add(new OllamaMessage(rol, mensaje.getContenido()));
        }
        return messages;
    }

    /** Llama a Ollama traduciendo fallos de red/timeout a excepciones de negocio con status claro. */
    private OllamaChatResponse invocarOllama(OllamaChatRequest ollamaRequest) {
        try {
            return ollamaRestClient.post()
                    .uri("/api/chat")
                    .body(ollamaRequest)
                    .retrieve()
                    .body(OllamaChatResponse.class);
        } catch (ResourceAccessException ex) {
            log.warn("Timeout o conexión rechazada con Ollama: {}", ex.getMessage());
            throw new AsistenteIaException(
                    "El asistente tardó demasiado en responder. Intenta con un mensaje más corto.",
                    HttpStatus.GATEWAY_TIMEOUT);
        } catch (RestClientException ex) {
            log.error("Error comunicándose con Ollama: {}", ex.getMessage());
            throw new AsistenteIaException(
                    "El servicio de IA no está disponible en este momento.",
                    HttpStatus.BAD_GATEWAY);
        }
    }

    /** Quita el bloque &lt;think&gt;...&lt;/think&gt; de deepseek-r1 y recorta espacios. */
    private String limpiarRazonamiento(String contenido) {
        return THINK_BLOCK.matcher(contenido).replaceAll("").trim();
    }
}
