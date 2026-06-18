package KuHub.modules.gestion_inventario.controller;

import KuHub.config.security.service.DynamicPermissionService;
import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.request.RestarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleRealItem;
import KuHub.modules.gestion_inventario.dtos.response.record.RestarDisponibleResult;
import KuHub.modules.gestion_inventario.dtos.response.record.StockDisponiblePage;
import KuHub.modules.gestion_inventario.services.StockDisponibleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Controller REST para gestión de stock disponible (sobrantes en bodega de tránsito).
 * Endpoints: /api/v1/stock-disponible
 * ✅ En uso: Consumido por registrarDisponiblesService en inventario.tsx (post-proceso TRASLADO).
 */
@RestController
@RequestMapping("/api/v1/stock-disponible")
public class StockDisponibleController {

    @Autowired
    private StockDisponibleService stockDisponibleService;

    @Autowired
    private DynamicPermissionService dynamicPermissionService;

    /**
     * Registra sobrantes detectados como stock disponible. El tipo lo define el DTO:
     * 'INVENTARIO' (default) para sobrantes de TRASLADO, o 'BODEGA_TRANSITO' para
     * sobrantes detectados al entregar menos de lo solicitado en una entrega diaria.
     * ✅ En uso: Consumido por registrarDisponiblesService en inventario.tsx (TRASLADO)
     * y en bodega-transito.tsx (entrega parcial → tipo BODEGA_TRANSITO).
     * Requiere permiso de ESCRITURA en el módulo INVENTARIO.
     */
    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(
            @Valid @RequestBody List<RegistrarDisponibleDTO> items,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "INVENTARIO", "write")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para registrar stock disponible"));
            }
            stockDisponibleService.registrar(items);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al registrar stock disponible", "message", e.getMessage()));
        }
    }

    /**
     * Suma el disponible activo por producto (solo los que tienen > 0), para un tipo dado.
     * Lo usa bodega de tránsito para decidir si mostrar el modal de salida con disponibles.
     * Retorna un mapa { idProducto: cantidadDisponible }.
     * ✅ En uso: Consumido por consultarDisponiblesPorProductoService en solicitud-service.ts.
     * Requiere permiso de LECTURA en el módulo INVENTARIO.
     */
    @GetMapping("/por-productos")
    public ResponseEntity<?> porProductos(
            @RequestParam("ids") List<Integer> ids,
            @RequestParam(defaultValue = "INVENTARIO") String tipo,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "INVENTARIO", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para consultar stock disponible"));
            }
            Map<Integer, BigDecimal> resultado = stockDisponibleService.consultarDisponiblePorProductos(ids, tipo);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al consultar stock disponible", "message", e.getMessage()));
        }
    }

    /**
     * Descuenta disponible por producto (FIFO) al registrar una salida/merma/devolución en
     * bodega de tránsito. El disponible es un marcador de sobrantes del mismo stock de bodega:
     * la salida real se procesa por el flujo de bodega; aquí solo se reduce el registro de sobrante.
     * Aplica sincronización ante procesos en paralelo: si el disponible real quedó por debajo de
     * lo solicitado, ese ítem NO se descuenta y se informa el valor real (estado INSUFICIENTE).
     * ✅ En uso: Consumido por restarDisponiblesService en solicitud-service.ts.
     * Requiere permiso de ESCRITURA en el módulo INVENTARIO.
     */
    @PostMapping("/restar")
    public ResponseEntity<?> restar(
            @Valid @RequestBody List<RestarDisponibleDTO> items,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "INVENTARIO", "write")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para descontar stock disponible"));
            }
            RestarDisponibleResult resultado = stockDisponibleService.restar(items);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al descontar stock disponible", "message", e.getMessage()));
        }
    }

    /**
     * Lista el stock disponible paginado (20 primera página, 10 siguientes), filtrado por tipo.
     * ✅ En uso: Consumido por StockDisponiblesModal en inventario.tsx.
     * Requiere permiso de LECTURA en el módulo INVENTARIO.
     */
    @GetMapping("/listar")
    public ResponseEntity<?> listar(
            @RequestParam(defaultValue = "INVENTARIO") String tipo,
            @RequestParam(defaultValue = "1") Integer page,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "INVENTARIO", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para ver stock disponible"));
            }
            StockDisponiblePage resultado = stockDisponibleService.listar(tipo, page);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al listar stock disponible", "message", e.getMessage()));
        }
    }

    /**
     * Lista el disponible real por producto, paginado: (inventario + bodega de tránsito) − demanda
     * comprometida de solicitudes EN_PEDIDO ya abastecidas − reservas activas EN_PEDIDO. Es el mismo
     * cálculo de la columna "Disponible" de Generar OP / "Por Pedido" del Conglomerado: representa el
     * stock libre, no asociado a ninguna solicitud.
     * El frontend filtra por nombre y scrollea (sin paginación).
     * ✅ En uso: Consumido por StockDisponiblesModal (pestaña "Disponible Real") en inventario.tsx y bodega-transito.tsx.
     * Requiere permiso de LECTURA en el módulo INVENTARIO.
     */
    @GetMapping("/disponible-real")
    public ResponseEntity<?> listarDisponibleReal(Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "INVENTARIO", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para ver el disponible real"));
            }
            List<DisponibleRealItem> resultado = stockDisponibleService.listarDisponibleReal();
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al listar el disponible real", "message", e.getMessage()));
        }
    }
}
