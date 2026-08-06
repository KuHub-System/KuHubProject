package KuHub.modules.gestion_inventario.controller;

import KuHub.config.security.service.DynamicPermissionService;
import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleInventarioPage;
import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleRealPage;
import KuHub.modules.gestion_inventario.dtos.response.record.SobranteBodegaPeriodoPage;
import KuHub.modules.gestion_inventario.services.StockDisponibleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * Controller REST para las 3 vistas de disponibilidad calculadas en vivo (Inventario, Bodega de
 * Tránsito por período, Disponible Real). Endpoints: /api/v1/stock-disponible
 * Ya no existe una tabla stock_disponible mantenida a mano: todo se calcula contra el stock
 * actual de inventario/bodega_transito y la demanda comprometida de solicitud/pedido/orden_pedido.
 * ✅ En uso: Consumido por StockDisponiblesModal (las 3 pestañas).
 */
@RestController
@RequestMapping("/api/v1/stock-disponible")
public class StockDisponibleController {

    @Autowired
    private StockDisponibleService stockDisponibleService;

    @Autowired
    private DynamicPermissionService dynamicPermissionService;

    /**
     * Disponible EN INVENTARIO por producto, calculado en vivo y paginado: del stock que hoy está
     * físicamente en inventario, cuánto no está comprometido con solicitudes EN_PEDIDO. Descuenta
     * primero la parte del compromiso que ya se abasteció a bodega de tránsito, porque el TRASLADO
     * ya restó de inventario.stock y volver a restar el compromiso entero lo contaría dos veces.
     * Trae también el excedente de bodega de tránsito: disponible + excedente da el mismo número
     * que la pestaña "Disponible Real", partido entre lo usable ahora y lo que necesita DEVOLUCION.
     * ✅ En uso: Consumido por StockDisponiblesModal (pestaña "Inventario").
     * Requiere permiso de LECTURA en el módulo SD_INVENTARIO.
     */
    @GetMapping("/inventario-disponible")
    public ResponseEntity<?> listarDisponibleInventario(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(required = false) Integer idCategoria,
            @RequestParam(required = false) String busqueda,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "SD_INVENTARIO", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para ver el disponible de Inventario"));
            }
            DisponibleInventarioPage resultado = stockDisponibleService.listarDisponibleInventario(busqueda, idCategoria, page);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al calcular el disponible de Inventario", "message", e.getMessage()));
        }
    }

    /**
     * Sobrante en Bodega de Tránsito calculado para un período, paginado y filtrable por
     * categoría y búsqueda: stock físico actual de bodega menos la demanda de las solicitudes
     * EN_PEDIDO (pedido APROBADO) cuya fecha_solicitada cae dentro del rango.
     * ✅ En uso: Consumido por StockDisponiblesModal (pestaña "Bodega Tránsito").
     * Requiere permiso de LECTURA en el módulo SD_BODEGA_TRANSITO.
     */
    @GetMapping("/bodega-transito-periodo")
    public ResponseEntity<?> listarBodegaTransitoPeriodo(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(required = false) Integer idCategoria,
            @RequestParam(required = false) String busqueda,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "SD_BODEGA_TRANSITO", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para ver el stock disponible de Bodega de Tránsito"));
            }
            SobranteBodegaPeriodoPage resultado = stockDisponibleService.listarBodegaTransitoPeriodo(
                    fechaInicio, fechaFin, page, idCategoria, busqueda);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al calcular el sobrante de Bodega de Tránsito", "message", e.getMessage()));
        }
    }

    /**
     * Lista el disponible real por producto, paginado: (inventario + bodega de tránsito) − demanda
     * comprometida de solicitudes EN_PEDIDO ya abastecidas − reservas activas EN_PEDIDO. Es el mismo
     * cálculo de la columna "Disponible" de Generar OP / "Por Pedido" del Conglomerado: representa el
     * stock libre, no asociado a ninguna solicitud. Filtrable por categoría y por nombre (búsqueda),
     * ambos resueltos en SQL para escalar cuando crezca el catálogo.
     * ✅ En uso: Consumido por StockDisponiblesModal (pestaña "Disponible Real").
     * Requiere permiso de LECTURA en el módulo SD_DISPONIBLE_REAL.
     */
    @GetMapping("/disponible-real")
    public ResponseEntity<?> listarDisponibleReal(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(required = false) Integer idCategoria,
            @RequestParam(required = false) String busqueda,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "SD_DISPONIBLE_REAL", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para ver el disponible real"));
            }
            DisponibleRealPage resultado = stockDisponibleService.listarDisponibleReal(busqueda, idCategoria, page);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al listar el disponible real", "message", e.getMessage()));
        }
    }
}
