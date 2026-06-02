package KuHub.modules.gestion_inventario.controller;

import KuHub.config.security.service.DynamicPermissionService;
import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.StockDisponiblePage;
import KuHub.modules.gestion_inventario.services.StockDisponibleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
}
