package KuHub.modules.gestion_inventario.controller;

import KuHub.modules.gestion_inventario.dtos.request.FilterInventoryPageDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductCreateDTO;
import KuHub.modules.gestion_inventario.dtos.request.InventoryWithProductUpdateDTO;
import KuHub.modules.gestion_inventario.dtos.request.SearchDTO;
import KuHub.modules.gestion_inventario.dtos.response.dto.StockSyncWarningDTO;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoriesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.BulkInventoryProcess;
import KuHub.modules.gestion_inventario.dtos.response.record.InventoriesPage;
import KuHub.modules.gestion_inventario.dtos.response.record.InventoryFilters;
import KuHub.modules.gestion_inventario.exceptions.StockDesincronizadoException;
import KuHub.modules.gestion_inventario.exceptions.StockInsuficienteException;
import KuHub.modules.gestion_inventario.services.InventarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para gestión de Inventario
 * Endpoints: /api/v1/inventario
 * ✅ En uso: Este controlador es central para la gestión del inventario, manejando 
 * la creación de productos con stock, actualizaciones masivas, filtrado paginado y validación de stock.
 * Consumido por inventario-service.ts en el frontend.
 */
@RestController
@Validated
@RequestMapping("/api/v1/inventario")
public class InventarioController {

    @Autowired
    private InventarioService inventarioService;

    /**
     * Obtiene los conjuntos de datos para filtros (Categorías y Unidades de Medida).
     * ✅ En uso: Consumido por obtenerFiltrosInventarioService en inventario-service.ts.
     */
    @GetMapping("/filters")
    public ResponseEntity<InventoryFilters> findFiltersInventory() {
        return ResponseEntity
                .status(200)
                .body(inventarioService.findFiltersInventory());
    }

    /**
     * Lista productos con stock procesado para el flujo de actualización masiva.
     * ✅ En uso: Consumido por obtenerBulkProductoInventoryListingService en inventario-service.ts.
     */
    @PostMapping("/massive-producto-inventory-listing")
    public ResponseEntity<BulkInventoriesPage> massiveProductInventoryListing(
            @RequestBody SearchDTO request){
        return ResponseEntity
                .status(200)
                .body(inventarioService.findByMassiveInventoryPaginated(request));
    }

    /**
     * Busca en el inventario productos que coincidan con un término en nombre o descripción.
     * ✅ En uso: Consumido por buscarProductosService en inventario-service.ts.
     */
    @PostMapping("/search-inventory")
    public ResponseEntity<InventoriesPage> searchInventory(
            @RequestBody SearchDTO request
    ) {
        return ResponseEntity
                .status(200)
                .body(inventarioService.searchInventory(request)
        );
    }

    /**
     * Obtiene una lista paginada de productos del inventario con filtros dinámicos.
     * ✅ En uso: Consumido por obtenerProductosPaginadosService en inventario-service.ts.
     */
    @PostMapping("/paged-inventory")
    public ResponseEntity<InventoriesPage> findPagedInventory(
            @RequestBody FilterInventoryPageDTO request
    ) {
        return ResponseEntity.status(200)
                .body(inventarioService.findPagedInventory(request));
    }

    /**
     * Busca productos en el inventario por su código específico.
     * ✅ En uso: Consumido por buscarProductosPorCodigoService en inventario-service.ts.
     */
    @PostMapping("/search-inventory-by-code")
    public ResponseEntity<InventoriesPage> searchInventoryByCodProducto(
            @RequestBody SearchDTO request
    ){
        return ResponseEntity
            .status(200)
            .body(inventarioService.searchInventoryByCodProducto(request));
    }

    /**
     * Registra un nuevo producto y su entrada inicial al inventario simultáneamente.
     * ✅ En uso: Consumido por crearProductoService en inventario-service.ts.
     */
    @PostMapping("/create-inventory-with-product")
        public ResponseEntity<Boolean> saveInventoryWithProduct(
         @Valid @RequestBody
         InventoryWithProductCreateDTO request){
             return ResponseEntity
                 .status(201)
                 .body(inventarioService.saveInventoryWithProduct(request));
     }


    /**
     * Actualiza un producto y ajusta su stock, manejando validaciones de sincronía.
     * ✅ En uso: Consumido por actualizarProductoService en inventario-service.ts.
     */
     @PatchMapping("/update-inventory-with-product")
        public ResponseEntity<?> updateInventoryWithProduct(
             @Validated @RequestBody InventoryWithProductUpdateDTO request){
        try {
            Object result = inventarioService.updateInventoryWithProduct(request);
            return ResponseEntity
                     .status(200)
                     .body(result);
        } catch (StockDesincronizadoException ex) {
            // Instanciamos tu nuevo DTO pasándole el mensaje y el item
            StockSyncWarningDTO responseBody = new StockSyncWarningDTO(
                    ex.getMessage(),
                    ex.getInventoryItem()
            );
            // Devolvemos la respuesta usando el status de la excepción (409)
            return ResponseEntity
                    .status(ex.getStatus())
                    .body(responseBody);
        }catch(StockInsuficienteException ex) {
             // 3. Caso 422: Stock insuficiente (NO SE GUARDÓ EN BD - Rollback)
             StockSyncWarningDTO responseBody = new StockSyncWarningDTO(
                     ex.getMessage(),
                     ex.getInventoryItem()
             );
             return ResponseEntity.status(ex.getStatus()).body(responseBody);
         }
     }

    /**
     * Procesa actualizaciones de stock para múltiples productos de forma atómica.
     * ✅ En uso: Consumido por bulkUpdateInventoryStockService en inventario-service.ts.
     */
    @PatchMapping("/bulk-update-inventory-stock")
    public ResponseEntity<BulkInventoryProcess> updateBulkInventoryStock(
            @Validated @RequestBody List<BulkInventoryProcess.ItemRequest> request) {
        BulkInventoryProcess result = inventarioService.processBulkInventoryUpdate(request);

        return ResponseEntity
                .status(200)
                .body(result);
    }

    /**
     * Elimina lógicamente un producto del inventario (si el stock lo permite).
     * ✅ En uso: Consumido por softDeleteInventarioService en inventario-service.ts.
     */
    @DeleteMapping("/soft-delete-inventory-with-product/{idInventario}")
        public ResponseEntity<Boolean> softDeleteInventoryWithProduct(
                @PathVariable Integer idInventario){
         return ResponseEntity
                 .status(204)
                 .body(inventarioService.softDeleteByInventoryWithProduct(idInventario));
    }


}
