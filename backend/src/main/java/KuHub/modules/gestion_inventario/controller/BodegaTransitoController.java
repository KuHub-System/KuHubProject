package KuHub.modules.gestion_inventario.controller;

import KuHub.config.security.service.DynamicPermissionService;
import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.request.WarehouseWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.exceptions.GestionInventarioException;
import KuHub.modules.gestion_inventario.dtos.response.dto.StockSyncWarningDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehouseProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkWarehousesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.WarehousesPage;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.services.BodegaTransitoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Bodega de Tránsito
 * Endpoints: /api/v1/bodega-transito
 * ✅ En uso: Este controlador gestiona la vista y actualización del stock en la bodega de tránsito, 
 * incluyendo búsquedas paginadas por nombre y código.
 * Consumido por bodega-transito-service.ts en el frontend.
 */
@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/v1/bodega-transito")
public class BodegaTransitoController {

    @Autowired
    private BodegaTransitoService bodegaTransitoService;

    @Autowired
    private DynamicPermissionService dynamicPermissionService;

    /**
     * Crea un producto nuevo con su inventario (stock=0) y su registro en bodega de tránsito,
     * aplicando ENTRADA_BODEGA si el stock inicial es mayor a cero.
     * ✅ En uso: Consumido por crearBodegaConProductoService en bodega-transito-service.ts.
     * Acceso dinámico: verificado contra permiso_rol (BODEGA_TRANSITO write).
     */
    @PostMapping("/create-bodega-con-producto")
    public ResponseEntity<?> createBodegaConProducto(
            @Validated @RequestBody InventoryWithProductCreateDTO request,
            Authentication authentication) {
        if (!dynamicPermissionService.check(authentication, "BODEGA_TRANSITO", "write")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            WarehousesPage.WarehouseItem result = bodegaTransitoService.createBodegaConProducto(request);
            return ResponseEntity.status(201).body(result);
        } catch (GestionInventarioException ex) {
            return ResponseEntity.status(ex.getStatus()).body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    /**
     * Busca productos en la bodega de tránsito que coincidan con un término en nombre o descripción.
     * ✅ En uso: Consumido por buscarBodegaTransitoService en bodega-transito-service.ts.
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
     * Busca productos en la bodega de tránsito por su código específico.
     * ✅ En uso: Consumido por buscarBodegaTransitoPorCodigoService en bodega-transito-service.ts.
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
     * Obtiene una lista paginada de productos en la bodega de tránsito con filtros dinámicos.
     * ✅ En uso: Consumido por obtenerBodegaPaginadaService en bodega-transito-service.ts.
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
     * Lista productos de bodega de tránsito con búsqueda paginada para el proceso masivo.
     * ✅ En uso: Consumido por obtenerBulkBodegaListingService en bodega-transito-service.ts.
     */
    @PostMapping("/massive-warehouse-listing")
    public ResponseEntity<BulkWarehousesPage> massiveWarehouseListing(
            @RequestBody SearchDTO request) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.findByMassiveBodegaPaginated(request));
    }

    /**
     * Procesa actualizaciones de stock masivas para la bodega de tránsito.
     * ✅ En uso: Consumido por bulkUpdateBodegaStockService en bodega-transito-service.ts.
     */
    @PatchMapping("/bulk-update-warehouse-stock")
    public ResponseEntity<BulkWarehouseProcess> updateBulkWarehouseStock(
            @Validated @RequestBody List<BulkWarehouseProcess.ItemRequest> request) {
        return ResponseEntity
                .status(200)
                .body(bodegaTransitoService.processBulkWarehouseUpdate(request));
    }

    /**
     * Actualiza un producto en la bodega de tránsito y ajusta su stock, manejando validaciones.
     * ✅ En uso: Consumido por actualizarBodegaTransitoConProductoService en bodega-transito-service.ts.
     * Acceso dinámico: verificado contra permiso_rol (BODEGA_TRANSITO write).
     */
    @PatchMapping("/update-warehouse-with-product")
        public ResponseEntity<?> updateTransitWarehouseWithProduct(
            @Validated @RequestBody WarehouseWithProductUpdateDTO request,
            Authentication authentication){
        if (!dynamicPermissionService.check(authentication, "BODEGA_TRANSITO", "write")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
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
