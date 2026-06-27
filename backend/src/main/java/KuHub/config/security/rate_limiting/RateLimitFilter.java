package KuHub.config.security.rate_limiting;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final int MAX_REQUESTS = 100;
    private final long TIME_WINDOW_MS = 60000; // 1 minuto en milisegundos

    // Mapa en memoria: Guarda la IP y sus datos [contador, tiempo de inicio]
    private final Map<String, long[]> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String ip = getClientIP(request);
        long currentTime = System.currentTimeMillis();

        long[] data = requestCounts.computeIfAbsent(ip, k -> new long[]{0, currentTime});

        // Reinicio del contador
        if (currentTime - data[1] > TIME_WINDOW_MS) {
            data[0] = 0;
            data[1] = currentTime;
            log.info("🔄 Minuto reiniciado para la IP: {}", ip); // 👈 LOG: Avisa cuando vuelve a cero
        }

        data[0]++;

        // 👈 LOG PRINCIPAL: Te muestra en tiempo real cuántas van
        log.info("📍 IP: {} | Petición {} de {}", ip, data[0], MAX_REQUESTS);

        // Bloqueo
        if (data[0] > MAX_REQUESTS) {
            // 👈 LOG DE PELIGRO: Te avisa exactamente cuándo bloquea a alguien
            log.warn("🚨 BLOQUEO HTTP 429 APLICADO a la IP: {} | Excedió el límite de {}", ip, MAX_REQUESTS);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());

            String origin = request.getHeader("Origin");
            if (origin != null) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Access-Control-Allow-Credentials", "true");
            }

            long secondsLeft = (TIME_WINDOW_MS - (currentTime - data[1])) / 1000;
            response.setHeader("Retry-After", String.valueOf(secondsLeft));

            response.getWriter().write("Has superado el limite de " + MAX_REQUESTS + " peticiones por minuto. Espera un momento.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
