package KuHub.modules.asistente_ia.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Configuración del cliente HTTP hacia el servidor Ollama (instancia de IA dedicada).
 *
 * <p>Toda la comunicación con la IA sale por la IP privada de la VPC; nunca por Internet.
 * Ver CONFIGURATION_HOST_IA.md para la topología de la Instancia C.</p>
 */
@Slf4j
@Configuration
public class IaConfig {

    /** URL base de Ollama. En producción apunta a la IP privada VPC (172.26.14.71:11434). */
    private final String ollamaUrl;

    /** Timeout de lectura en segundos. La inferencia en CPU puede tardar; por defecto 120s. */
    private final int timeoutSeconds;

    public IaConfig(
            @Value("${kuhub.ia.ollama-url:http://172.26.14.71:11434}") String ollamaUrl,
            @Value("${kuhub.ia.timeout-seconds:120}") int timeoutSeconds) {
        this.ollamaUrl = ollamaUrl;
        this.timeoutSeconds = timeoutSeconds;
    }

    /**
     * Cliente REST preconfigurado para hablar con Ollama.
     * Connect timeout corto (10s) y read timeout amplio (configurable) por la lentitud de la inferencia en CPU.
     */
    @Bean
    public RestClient ollamaRestClient() {
        log.info("Asistente IA → URL de Ollama configurada: {} (timeout lectura: {}s)", ollamaUrl, timeoutSeconds);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        return RestClient.builder()
                .baseUrl(ollamaUrl)
                .requestFactory(factory)
                .build();
    }
}
