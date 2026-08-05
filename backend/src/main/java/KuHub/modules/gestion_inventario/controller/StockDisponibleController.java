package KuHub.modules.gestion_inventario.controller;

import KuHub.config.security.service.DynamicPermissionService;
import KuHub.modules.gestion_inventario.dtos.request.RegistrarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.request.RestarDisponibleDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.DisponibleRealPage;
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
     * Lista el stock disponible de Inventario, paginado (20 primera página, 10 siguientes) y
     * filtrable por categoría. Endpoint propio (no comparte handler con Bodega de Tránsito ni
     * Disponible Real) para que la matriz de permisos gobierne cada pestaña por separado y no se
     * pidan datos de una vista que el rol no puede ver.
     * agrupado=true (default): una fila por producto con la cantidad sumada de todos sus registros
     * de sobrante. agrupado=false: una fila por cada evento de registro individual, con el usuario
     * que lo generó — misma idea que el historial de Movimientos.
     * ✅ En uso: Consumido por StockDisponiblesModal (pestaña "Inventario").
     * Requiere permiso de LECTURA en el módulo SD_INVENTARIO.
     */
    @GetMapping("/inventario")
    public ResponseEntity<?> listarInventario(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(required = false) Integer idCategoria,
            @RequestParam(defaultValue = "true") Boolean agrupado,
            @RequestParam(required = false) String busqueda,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "SD_INVENTARIO", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para ver el stock disponible de Inventario"));
            }
            StockDisponiblePage resultado = stockDisponibleService.listarInventario(page, idCategoria, agrupado, busqueda);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al listar stock disponible de Inventario", "message", e.getMessage()));
        }
    }

    /**
     * Lista el stock disponible de Bodega de Tránsito, paginado (20 primera página, 10 siguientes)
     * y filtrable por categoría. Endpoint propio, ver justificación y semántica de "agrupado" en
     * {@link #listarInventario}.
     * ✅ En uso: Consumido por StockDisponiblesModal (pestaña "Bodega Tránsito").
     * Requiere permiso de LECTURA en el módulo SD_BODEGA_TRANSITO.
     */
    @GetMapping("/bodega-transito")
    public ResponseEntity<?> listarBodegaTransito(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(required = false) Integer idCategoria,
            @RequestParam(defaultValue = "true") Boolean agrupado,
            @RequestParam(required = false) String busqueda,
            Authentication authentication) {
        try {
            if (!dynamicPermissionService.check(authentication, "SD_BODEGA_TRANSITO", "read")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "No tiene permisos para ver el stock disponible de Bodega de Tránsito"));
            }
            StockDisponiblePage resultado = stockDisponibleService.listarBodegaTransito(page, idCategoria, agrupado, busqueda);
            return ResponseEntity.status(HttpStatus.OK).body(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al listar stock disponible de Bodega de Tránsito", "message", e.getMessage()));
        }
    }

    /**
     * Lista el disponible real por producto, paginado: (inventario + bodega de tránsito) − demanda
     * comprometida de solicitudes EN_PEDIDO ya abastecidas − reservas activas EN_PEDIDO. Es el mismo
     * cálculo de la columna "Disponible" de Generar OP / "Por Pedido" del Conglomerado: representa el
     * stock libre, no asociado a ninguna solicitud. Filtrable por categoría y por nombre (búsqueda),
     * ambos resueltos en SQL para escalar cuando crezca el catálogo.
     * Endpoint propio, ver justificación en {@link #listarInventario}.
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
