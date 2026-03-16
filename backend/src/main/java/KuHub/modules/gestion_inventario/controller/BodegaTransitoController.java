package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.StockSyncWarningDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.WarehousesPage;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.services.BodegaTransitoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/bodega-transito")
public class BodegaTransitoController {

    @Autowired
    private BodegaTransitoService bodegaTransitoService;

    /**
     * Busca bodega de tránsito paginada por nombre o descripción del producto.
     * ✅ En uso: Consumido por el buscador general del frontend.
     */
    @PostMapping("/search-bodega")
    public ResponseEntity<WarehousesPage> searchTransitWarehousePage(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.searchTransitWarehousePage(request));
    }

    /**
     * Busca bodega de tránsito paginada por código de producto.
     * ✅ En uso: Consumido por el input "Buscar código..." en el frontend.
     */
    @PostMapping("/search-by-cod-producto")
    public ResponseEntity<WarehousesPage> searchWarehouseByCodProduct(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.searchWarehouseByCodProduct(request));
    }

    /**
     * Lista la bodega de tránsito paginada aplicando filtros dinámicos opcionales.
     * ✅ En uso: Carga inicial de la página y filtros avanzados.
     */
    @PostMapping("/paged-bodega")
    public ResponseEntity<WarehousesPage> findPagedTransitWarehouse(
            @RequestBody FilterInventoryPageDTO filter
    ) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.findPagedTransitWarehouse(filter));
    }

    /**
     * Actualiza la bodega de tránsito con producto, registrando el movimiento según tipo.
     * Maneja desincronización de stock y stock insuficiente retornando respuestas diferenciadas.
     * ✅ En uso: Endpoint consumido por el frontend.
     */
    @PatchMapping("/update-warehouse-with-product")
        public ResponseEntity<?> updateTransitWarehouseWithProduct(
            @Validated @RequestBody WarehouseWithProductUpdateDTO request){
        try {
            Object result = bodegaTransitoService.updateTransitWarehouseWithProduct(request);
            return ResponseEntity
                    .status(200)
                    .body(result);

        }catch (StockDesincronizadoException ex) {
            // ⚠️ 409: Desincronizado pero Operable (SÍ SE GUARDÓ)
            StockSyncWarningDTO responseBody = new StockSyncWarningDTO(ex.getMessage(), ex.getInventoryItem());
            return ResponseEntity
                    .status(200)
                    .body(responseBody);
        }catch(StockInsuficienteException ex) {
            // ❌ 422: Stock insuficiente (NO SE GUARDÓ EN BD - Rollback automático)
            StockSyncWarningDTO responseBody = new StockSyncWarningDTO(ex.getMessage(), ex.getInventoryItem());
            return ResponseEntity
                    .status(200)
                    .body(responseBody);
        }
    }
}
