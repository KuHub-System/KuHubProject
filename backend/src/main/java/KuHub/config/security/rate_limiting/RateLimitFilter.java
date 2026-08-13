package KuHub.config.security.rate_limiting;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limitador de peticiones por IP, ventana fija de 1 minuto.
 *
 * Historial de correcciones (detectadas durante una prueba de carga sobre
 * produccion, ver documentacion de infraestructura):
 * 1) Bypass por X-Forwarded-For: el filtro tomaba el primer valor de ese
 *    header, que el propio cliente controla y puede falsificar en cada
 *    peticion para que cada una cuente como una IP distinta. Se prioriza
 *    ahora X-Real-IP, que Nginx setea desde $remote_addr y el cliente no
 *    puede sobrescribir (ver frontend/nginx.prod.conf).
 * 2) Fuga de memoria: el mapa de IPs nunca purgaba entradas vencidas, por
 *    lo que crecia sin limite con cada IP que alguna vez toco el servidor
 *    (incluyendo escaneres automaticos). Se agrega una limpieza periodica.
 * 3) Contador no atomico: `data[0]++` sobre un long[] compartido no es
 *    thread-safe bajo concurrencia real; se reemplaza por AtomicInteger.
 *
 * Limitacion conocida y aceptada: la ventana es fija, no deslizante. Es
 * posible enviar hasta 2x MAX_REQUESTS en un intervalo corto que cruce el
 * limite de dos ventanas consecutivas (ej. al final del minuto 1 y al
 * inicio del minuto 2). Se documenta como trade-off deliberado: una
 * ventana deslizante real añadiria complejidad desproporcionada para el
 * volumen de trafico actual del sistema.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // Configurable via variable de entorno RATE_LIMIT_MAX_REQUESTS (ver
    // docker-compose.prod.yml), para poder subir el limite temporalmente
    // durante una prueba de carga sin recompilar. Valor por defecto: 100.
    @Value("${rate.limit.max-requests:100}")
    private int maxRequests;

    private static final long TIME_WINDOW_MS = 60_000; // 1 minuto

    /** Cada cuanto se purgan del mapa las ventanas vencidas. */
    private static final long CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutos

    /** Contador y marca de inicio de ventana para una IP. */
    private static class Ventana {
        final AtomicInteger contador = new AtomicInteger(0);
        volatile long inicio;

        Ventana(long inicio) {
            this.inicio = inicio;
        }
    }

    // Mapa en memoria: Guarda la IP y su ventana de conteo actual
    private final Map<String, Ventana> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String ip = getClientIP(request);
        long currentTime = System.currentTimeMillis();

        Ventana ventana = requestCounts.computeIfAbsent(ip, k -> new Ventana(currentTime));

        // Reinicio del contador si la ventana vencio. Sincronizado sobre la
        // propia ventana para que el reset y el conteo no corran en carrera
        // entre hilos concurrentes de la misma IP.
        synchronized (ventana) {
            if (currentTime - ventana.inicio > TIME_WINDOW_MS) {
                ventana.contador.set(0);
                ventana.inicio = currentTime;
                log.info("🔄 Minuto reiniciado para la IP: {}", ip);
            }
        }

        int peticionActual = ventana.contador.incrementAndGet();

        // 👈 LOG PRINCIPAL: Te muestra en tiempo real cuántas van
        log.info("📍 IP: {} | Petición {} de {}", ip, peticionActual, maxRequests);

        // Bloqueo
        if (peticionActual > maxRequests) {
            // 👈 LOG DE PELIGRO: Te avisa exactamente cuándo bloquea a alguien
            log.warn("🚨 BLOQUEO HTTP 429 APLICADO a la IP: {} | Excedió el límite de {}", ip, maxRequests);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());

            String origin = request.getHeader("Origin");
            if (origin != null) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Access-Control-Allow-Credentials", "true");
            }

            long secondsLeft = Math.max(0, (TIME_WINDOW_MS - (currentTime - ventana.inicio)) / 1000);
            response.setHeader("Retry-After", String.valueOf(secondsLeft));

            response.getWriter().write("Has superado el limite de " + maxRequests + " peticiones por minuto. Espera un momento.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Determina la IP real del cliente. Prioriza X-Real-IP, que Nginx setea
     * a partir de $remote_addr y el cliente no puede modificar. No se confia
     * en X-Forwarded-For como fuente principal porque su primer valor lo
     * define el propio cliente, permitiendo eludir el limite variandolo en
     * cada peticion.
     */
    private String getClientIP(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }

    /**
     * Purga periodica de ventanas vencidas. Sin esto el mapa crece sin
     * limite con cada IP que alguna vez toco el servidor, incluyendo
     * escaneres automaticos que no vuelven a repetirse.
     */
    @Scheduled(fixedRate = CLEANUP_INTERVAL_MS)
    void limpiarVentanasVencidas() {
        long currentTime = System.currentTimeMillis();
        int antes = requestCounts.size();
        requestCounts.entrySet().removeIf(entry -> currentTime - entry.getValue().inicio > TIME_WINDOW_MS);
        int eliminadas = antes - requestCounts.size();
        if (eliminadas > 0) {
            log.info("🧹 Limpieza de rate limit: {} IPs vencidas eliminadas, {} activas", eliminadas, requestCounts.size());
        }
    }
}
